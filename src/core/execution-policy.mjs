import { TOOLS } from "./tools.mjs";
import { normalize } from "./model.mjs";

export function autoExecute(plan, state) {
  return (
    plan.steps.every(
      (step) =>
        !TOOLS[step.tool].native && TOOLS[step.tool].risk !== "sensitive",
    ) ||
    (state.agent.autonomy &&
      state.settings.access.mode === "full" &&
      plan.steps.every((step) => TOOLS[step.tool].risk !== "sensitive"))
  );
}
export function approvalRequired(step, state) {
  const tool = TOOLS[step.tool];
  return (
    tool.risk === "sensitive" ||
    (tool.native &&
      (state.settings.access.mode !== "full" ||
        (tool.risk !== "read" && !state.agent.autonomy)))
  );
}
// Labels are only an additional warning signal, never permission to execute a tool.
export function criticalInteraction(description) {
  const value = normalize(
    typeof description === "string" ? description : JSON.stringify(description),
  );
  return /\b(excluir|apagar|deletar|delete|remove|formatar|format|comprar|buy|purchase|pagar|pay|checkout|transferir|transfer|enviar|send|publicar|publish|post|senha|password|login|sign in|autorizar|authorize|permitir|allow|instalar|install|executar|run as|admin|desligar|shutdown|reiniciar|restart)\b/.test(
    value,
  );
}
