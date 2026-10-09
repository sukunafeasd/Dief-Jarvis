import { localPlan, TOOLS } from "./tools.mjs";
import { textValue, canonical } from "./model.mjs";
import { autoExecute as mayAutoExecute } from "./execution-policy.mjs";
export { mayAutoExecute };
function localSummary(observation) {
  if (
    ["task.list", "task.search"].includes(observation.tool) ||
    (observation.tool === "screen.open" && observation.output.startsWith("{"))
  ) {
    const result = JSON.parse(observation.output);
    return `Encontrei ${result.total} tarefa(s). ${
      result.tasks
        .slice(0, 6)
        .map(
          (task) =>
            `${task.text.length > 180 ? task.text.slice(0, 177) + "..." : task.text}: ${task.done ? "concluida" : "aberta"}`,
        )
        .join("; ") || "Nenhuma tarefa encontrada."
    }`;
  }
  if (observation.tool === "task.complete")
    return `Conclui a tarefa: ${JSON.parse(observation.output).text}.`;
  if (observation.tool === "weather.current") {
    const data = JSON.parse(observation.output);
    return `${data.title}: ${data.temperature} graus Celsius. ${data.condition || "Condicao do tempo nao informada."}`;
  }
  if (observation.tool === "weather.forecast") {
    const data = JSON.parse(observation.output);
    return (
      `Previsao para ${data.title}. ` +
      data.days
        .slice(0, 3)
        .map(
          (day) =>
            `${day.date}: minima ${day.minC}, maxima ${day.maxC} graus Celsius. Chance de chuva: ${day.precipitationChance} por cento.`,
        )
        .join(" ")
    );
  }
  if (observation.tool === "news.headlines")
    return (
      "Noticias de tecnologia, pelo Hacker News. " +
      JSON.parse(observation.output)
        .slice(0, 5)
        .map((item) => item.title + ".")
        .join(" ")
    );
  if (observation.tool === "system.hardware") {
    const data = JSON.parse(observation.output);
    return `Memoria RAM em ${data.memory.usedPercent} por cento de uso. Os detalhes do sistema estao na tela.`;
  }
  if (observation.tool === "screen.open") {
    return observation.output;
  }
  return observation.output.length <= 3500
    ? observation.output
    : observation.output.slice(0, 3400) +
        "\n[Resposta parcial. O resultado completo esta em Execucoes.]";
}
export class AssistantSession {
  constructor(engine, agent, options = {}) {
    this.engine = engine;
    this.agent = agent;
    this.options = options;
    this.active = null;
  }
  async resume(id) {
    const state = await this.engine.read();
    const run = state.runs.find((item) => item.id === id);
    if (run?.status !== "completed")
      throw Error("Conclua o plano antes de continuar.");
    return this.respond(run.goal, {
      continuation: true,
      completedSteps: run.steps,
      observations: run.steps.map(({ tool, output }) => ({ tool, output })),
    });
  }
  async respond(content, options = {}) {
    textValue(content);
    if (this.active || this.agent.active)
      throw Error("Ja estou atendendo uma tarefa. Interrompa ou aguarde.");
    const abort = new AbortController();
    this.active = abort;
    const timeout = this.options.timeoutMs
      ? setTimeout(() => this.stop(), this.options.timeoutMs)
      : null;
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
      const observations = [...(options.observations || [])];
      const completedEffects = new Set(
        (options.completedSteps || [])
          .filter((step) => TOOLS[step.tool].risk !== "read")
          .map(({ tool, args }) => canonical({ tool, args })),
      );
      for (;;) {
        abort.signal.throwIfAborted();
        const state = await this.engine.read();
        let decision;
        if (state.agent.provider === "local") {
          if (observations.length)
            decision = {
              summary: localSummary(observations.at(-1)),
              steps: [],
            };
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
            continuation: options.continuation === true,
          });
        const proposedEffects = new Set(completedEffects);
        for (const step of decision.steps) {
          if (
            TOOLS[step.tool].risk !== "read" &&
            proposedEffects.has(canonical(step))
          )
            throw Error(
              "O modelo tentou repetir uma alteracao ja concluida. Parei para evitar duplicacao.",
            );
          if (TOOLS[step.tool].risk !== "read")
            proposedEffects.add(canonical(step));
        }
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
            continuation: options.continuation === true,
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
        for (const step of decision.steps)
          if (TOOLS[step.tool].risk !== "read")
            completedEffects.add(canonical(step));
      }
    } catch (error) {
      const reply = abort.signal.aborted
        ? "Interrompi o atendimento. Acoes ja concluidas continuam registradas."
        : `Nao consegui concluir: ${error.message.slice(0, 900)}. Confira Execucoes para ver o que foi feito.`;
      return await this.engine.execute({
        type: "assistant.record",
        content,
        reply,
        continuation: options.continuation === true,
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
