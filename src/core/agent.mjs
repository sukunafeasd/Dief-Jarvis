import { localPlan, TOOLS, validatePlan } from "./tools.mjs";
import { textValue } from "./model.mjs";
import { approvalRequired, taskAuthorized } from "./execution-policy.mjs";

export class AgentController {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.options = options;
    this.active = null;
  }
  async commit(action) {
    const result = await this.engine.execute(action);
    this.options.onChange?.(result.state);
    return result;
  }
  recover() {
    this.recovery ||= this.recoverInterrupted();
    return this.recovery;
  }
  async recoverInterrupted() {
    const state = await this.engine.read();
    for (const run of state.runs.filter((item) =>
      ["planning", "running"].includes(item.status),
    ))
      await this.commit({
        type: "agent.finish",
        id: run.id,
        status: "interrupted",
        error:
          "Aplicativo interrompido. Nenhuma etapa externa sera repetida automaticamente; confira os efeitos antes de criar outro plano.",
      });
  }
  async plan(goal) {
    textValue(goal);
    if (this.active) throw Error("Uma execucao ja esta ativa.");
    const operation = { id: null, abort: new AbortController() };
    this.active = operation;
    try {
      const { state } = await this.commit({ type: "agent.create", goal });
      operation.id = state.runs[0].id;
      const plan =
        state.agent.provider === "local"
          ? localPlan(goal)
          : await this.options.planner?.(goal, state, operation.abort.signal);
      operation.abort.signal.throwIfAborted();
      const validated = validatePlan(plan);
      const current = await this.engine.read();
      for (const step of validated.steps) this.check(step, current);
      return await this.commit({
        type: "agent.plan",
        id: operation.id,
        plan: validated,
      });
    } catch (error) {
      if (!operation.id) throw error;
      return await this.commit({
        type: "agent.finish",
        id: operation.id,
        status: operation.abort.signal.aborted ? "cancelled" : "failed",
        error: operation.abort.signal.aborted
          ? "Planejamento cancelado."
          : error.message.slice(0, 1000),
      });
    } finally {
      if (this.active === operation) this.active = null;
    }
  }
  check(step, state) {
    const tool = TOOLS[step.tool];
    if (tool.native && typeof this.options.execute !== "function")
      throw Error("Esta ferramenta requer o EXE, nao o navegador.");
    if (tool.permission && !state.settings.access[tool.permission])
      throw Error(
        `Autorize ${tool.permission === "files" ? "arquivos" : tool.permission === "desktop" ? "controle do PC" : tool.permission === "commands" ? "comandos locais" : "pesquisa web"} nos ajustes.`,
      );
    if (
      tool.permission === "files" &&
      state.settings.access.mode !== "full" &&
      !state.agent.workspace
    )
      throw Error("Selecione uma pasta autorizada antes de usar arquivos.");
    if (
      tool.permission === "commands" &&
      ((state.settings.access.mode !== "full" && !state.agent.workspace) ||
        !state.settings.access.files)
    )
      throw Error(
        "Comandos precisam de arquivos autorizados e uma pasta de trabalho.",
      );
  }
  async run(id) {
    if (this.active) throw Error("Uma execucao ja esta ativa.");
    const operation = { id, abort: new AbortController() };
    this.active = operation;
    let started = false;
    try {
      const state = await this.engine.read();
      const run = state.runs.find((item) => item.id === id);
      if (!run || run.status !== "planned")
        throw Error("Plano nao esta aguardando autorizacao.");
      for (const step of run.steps) this.check(step, state);
      operation.abort.signal.throwIfAborted();
      await this.commit({ type: "agent.start", id, confirmed: true });
      started = true;
      for (let index = 0; index < run.steps.length; index++) {
        operation.abort.signal.throwIfAborted();
        const step = run.steps[index];
        let current = await this.engine.read();
        this.check(step, current);
        if (current.agent.workspace !== state.agent.workspace)
          throw Error("A pasta autorizada mudou. Crie um novo plano.");
        await this.commit({
          type: "agent.step",
          id,
          index,
          status: "running",
          output: "",
        });
        try {
          if (!TOOLS[step.tool].native) {
            await this.commit({ type: "agent.local", id, index });
          } else {
            if (
              !taskAuthorized(current) &&
              (approvalRequired(step, current) ||
                (await this.options.requiresApproval?.(step, current)) === true)
            ) {
              if (!(await this.options.approve?.(step)))
                throw Error("Operacao nao autorizada pelo operador.");
            }
            operation.abort.signal.throwIfAborted();
            current = await this.engine.read();
            this.check(step, current);
            if (
              JSON.stringify(current.settings.access) !==
                JSON.stringify(state.settings.access) ||
              current.agent.autonomy !== state.agent.autonomy
            )
              throw Error(
                "A politica mudou durante a execucao; crie um novo plano.",
              );
            if (current.agent.workspace !== state.agent.workspace)
              throw Error("Pasta revogada ou alterada.");
            const output = await this.options.execute(
              step,
              current,
              operation.abort.signal,
            );
            // Persist actual effects even when cancellation arrives while the OS is finishing them.
            await this.commit({
              type: "agent.step",
              id,
              index,
              status: "completed",
              output: textValue(
                typeof output === "string" && output.length > 20000
                  ? output.slice(0, 19800) +
                      "\n[Observacao parcial: excedeu o tamanho do registro. Nao interprete como resultado completo.]"
                  : output,
                20000,
              ),
            });
          }
        } catch (error) {
          const fresh = await this.engine.read();
          if (
            fresh.runs.find((item) => item.id === id)?.steps[index]?.status ===
            "running"
          )
            await this.commit({
              type: "agent.step",
              id,
              index,
              status: operation.abort.signal.aborted ? "cancelled" : "failed",
              output: error.message.slice(0, 1000),
            });
          throw error;
        }
      }
      return await this.commit({
        type: "agent.finish",
        id,
        status: "completed",
      });
    } catch (error) {
      const current = await this.engine.read();
      if (!started) {
        if (
          operation.abort.signal.aborted &&
          current.runs.find((item) => item.id === id)?.status === "planned"
        )
          return await this.commit({
            type: "agent.finish",
            id,
            status: "cancelled",
            error: "Cancelado antes da execucao.",
          });
        throw error;
      }
      if (current.runs.find((item) => item.id === id)?.status !== "running")
        throw error;
      return await this.commit({
        type: "agent.finish",
        id,
        status: operation.abort.signal.aborted ? "cancelled" : "failed",
        error: operation.abort.signal.aborted
          ? "Execucao interrompida pelo operador. Etapas concluidas nao foram desfeitas."
          : error.message.slice(0, 1000),
      });
    } finally {
      if (this.active === operation) this.active = null;
    }
  }
  async prepare(goal, plan) {
    if (this.active) throw Error("Uma execucao ja esta ativa.");
    const validated = validatePlan(plan);
    const operation = { id: null, abort: new AbortController() };
    this.active = operation;
    try {
      const current = await this.engine.read();
      for (const step of validated.steps) this.check(step, current);
      operation.abort.signal.throwIfAborted();
      const created = await this.commit({ type: "agent.create", goal });
      operation.id = created.state.runs[0].id;
      return await this.commit({
        type: "agent.plan",
        id: operation.id,
        plan: validated,
      });
    } finally {
      if (this.active === operation) this.active = null;
    }
  }
  async cancel(id) {
    if (this.active?.id === id) {
      this.active.abort.abort(Error("Cancelado pelo operador."));
      return { state: await this.engine.read() };
    }
    if (this.active) throw Error("Aguarde a execucao ativa.");
    return this.commit({
      type: "agent.finish",
      id,
      status: "cancelled",
      error: "Plano cancelado sem executar.",
    });
  }
}
