import { localPlan, TOOLS } from "./tools.mjs";
import { textValue } from "./model.mjs";
export function mayAutoExecute(plan, state) {
  return (
    plan.steps.every((step) => !TOOLS[step.tool].native) ||
    (state.agent.autonomy &&
      state.settings.access.mode === "full" &&
      plan.steps.every(
        (step) =>
          TOOLS[step.tool].risk !== "sensitive" &&
          !["workspace.create", "workspace.trash"].includes(step.tool),
      ))
  );
}
export class AssistantSession {
  constructor(engine, agent, options = {}) {
    this.engine = engine;
    this.agent = agent;
    this.options = options;
    this.active = null;
  }
  async respond(content) {
    textValue(content);
    if (this.active || this.agent.active)
      throw Error("Ja estou atendendo uma tarefa. Interrompa ou aguarde.");
    const abort = new AbortController();
    this.active = abort;
    const timeout = setTimeout(
      () => this.stop(),
      this.options.timeoutMs || 180000,
    );
    try {
      if (/^(?:jarvis|oi|ola)[!.?\s]*$/i.test(content)) {
        const state = await this.engine.read();
        return this.engine.execute({
          type: "assistant.record",
          content,
          reply:
            state.settings.voiceLang === "en-GB"
              ? `I am here, ${state.settings.name}. Go ahead.`
              : `Estou aqui, ${state.settings.name}. Pode falar.`,
        });
      }
      const observations = [];
      let steps = 0;
      for (let round = 0; round < 5; round++) {
        abort.signal.throwIfAborted();
        const state = await this.engine.read();
        let decision;
        if (state.agent.provider === "local") {
          if (observations.length)
            decision = { summary: observations.at(-1).output, steps: [] };
          else {
            try {
              decision = localPlan(content);
            } catch {
              return await this.engine.execute({ type: "chat.send", content });
            }
          }
        } else
          decision = await this.options.decide(
            content,
            state,
            observations,
            abort.signal,
          );
        if (!decision.steps.length)
          return await this.engine.execute({
            type: "assistant.record",
            content,
            reply: decision.summary,
          });
        if (steps + decision.steps.length > 8)
          throw Error(
            "Limite de 8 passos atingido; confira o historico antes de continuar.",
          );
        const prepared = await this.agent.prepare(content, decision);
        const run = prepared.state.runs[0];
        if (abort.signal.aborted) {
          await this.agent.cancel(run.id);
          abort.signal.throwIfAborted();
        }
        if (!mayAutoExecute(decision, prepared.state)) {
          return await this.engine.execute({
            type: "assistant.record",
            content,
            reply:
              "Preparei um plano. Ele precisa da sua autorizacao em Execucoes; nenhuma etapa desse plano foi executada.",
          });
        }
        const done = await this.agent.run(run.id);
        const finished = done.state.runs.find((item) => item.id === run.id);
        if (finished?.status !== "completed")
          throw Error(finished?.error || "A tarefa nao foi concluida.");
        observations.push(
          ...finished.steps.map((step) => ({
            tool: step.tool,
            output: step.output,
          })),
        );
        steps += decision.steps.length;
      }
      throw Error(
        "Limite de ciclos atingido; a tarefa parou sem continuar automaticamente.",
      );
    } catch (error) {
      const reply = abort.signal.aborted
        ? "Interrompi o atendimento. Acoes ja concluidas continuam registradas."
        : `Nao consegui concluir: ${error.message.slice(0, 900)}. Confira Execucoes para ver o que foi feito.`;
      return await this.engine.execute({
        type: "assistant.record",
        content,
        reply,
      });
    } finally {
      clearTimeout(timeout);
      this.active = null;
    }
  }
  stop() {
    this.active?.abort(Error("Atendimento cancelado."));
    if (this.agent.active?.id)
      this.agent.cancel(this.agent.active.id).catch(() => {});
  }
}
