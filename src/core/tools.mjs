import { textValue, normalize } from "./model.mjs";

const text = (max) => ({ type: "string", minLength: 1, maxLength: max });
const spec = (title, permission, native, fields) =>
  Object.freeze({
    title,
    permission,
    native,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: fields,
      required: Object.keys(fields),
    },
  });
export const TOOLS = Object.freeze({
  "task.create": spec("Criar tarefa", null, false, { text: text(500) }),
  "memory.create": spec("Guardar memoria", null, false, { text: text(4000) }),
  "screen.open": spec("Mostrar painel", null, false, {
    panel: {
      type: "string",
      enum: ["tasks", "memory", "audit", "briefing", "connections", "settings"],
    },
  }),
  "workspace.list": spec("Listar pasta autorizada", "files", true, {
    path: text(240),
  }),
  "workspace.read": spec("Ler arquivo de texto", "files", true, {
    path: text(240),
  }),
  "workspace.create": spec("Criar arquivo de texto", "files", true, {
    path: text(240),
    content: text(16000),
  }),
  "workspace.trash": spec("Enviar arquivo para a Lixeira", "files", true, {
    path: text(240),
  }),
  "web.search": spec("Abrir pesquisa no navegador", "web", true, {
    query: text(300),
  }),
});
function object(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw Error("Formato de plano invalido.");
}
export function validateStep(step) {
  object(step, ["tool", "args"]);
  if (!Object.hasOwn(TOOLS, step.tool))
    throw Error("Ferramenta nao autorizada.");
  const schema = TOOLS[step.tool].schema;
  object(step.args, schema.required);
  for (const key of schema.required) {
    const value = step.args[key],
      rule = schema.properties[key];
    textValue(value, rule.maxLength || 240);
    if (rule.enum && !rule.enum.includes(value))
      throw Error("Argumento nao autorizado.");
  }
  return structuredClone(step);
}
export function validatePlan(value) {
  object(value, ["summary", "steps"]);
  const summary = textValue(value.summary, 1000);
  if (
    !Array.isArray(value.steps) ||
    !value.steps.length ||
    value.steps.length > 8
  )
    throw Error("Um plano precisa de 1 a 8 etapas.");
  return { summary, steps: value.steps.map(validateStep) };
}
export const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "steps"],
  properties: {
    summary: text(1000),
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        oneOf: Object.entries(TOOLS).map(([name, tool]) => ({
          type: "object",
          additionalProperties: false,
          required: ["tool", "args"],
          properties: { tool: { const: name }, args: tool.schema },
        })),
      },
    },
  },
};
export function localPlan(goal) {
  textValue(goal, 4000);
  const steps = goal.split(/\s*;\s*/).map((part) => {
    const command = normalize(part);
    const task = part.match(
      /^(?:crie|criar|adicione) (?:uma )?tarefa\s*:\s*(.+)$/is,
    );
    if (task) return { tool: "task.create", args: { text: task[1].trim() } };
    const memory = part.match(/^lembre que\s+(.+)$/is);
    if (memory)
      return { tool: "memory.create", args: { text: memory[1].trim() } };
    const search = part.match(/^pesquise\s+(.+)$/is);
    if (search)
      return { tool: "web.search", args: { query: search[1].trim() } };
    if (/^liste (?:a )?pasta$/.test(command))
      return { tool: "workspace.list", args: { path: "." } };
    const file = part.match(/^(leia|exclua) arquivo\s+(.+)$/is);
    if (file)
      return {
        tool:
          file[1].toLowerCase() === "leia"
            ? "workspace.read"
            : "workspace.trash",
        args: { path: file[2].trim() },
      };
    const create = part.match(/^crie arquivo\s+([^:]+):\s*(.+)$/is);
    if (create)
      return {
        tool: "workspace.create",
        args: { path: create[1].trim(), content: create[2].trim() },
      };
    const panels = {
      tarefas: "tasks",
      memoria: "memory",
      auditoria: "audit",
      briefing: "briefing",
      conexoes: "connections",
      ajustes: "settings",
    };
    const panel = command.match(
      /^mostre (tarefas|memoria|auditoria|briefing|conexoes|ajustes)$/,
    );
    if (panel)
      return { tool: "screen.open", args: { panel: panels[panel[1]] } };
    throw Error(
      "Pedido fora do planejador local. Conecte um modelo ou use um comando do catalogo.",
    );
  });
  return validatePlan({ summary: "Plano de comandos locais", steps });
}

export const RUN_STATES = [
  "planning",
  "planned",
  "running",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
];
export const STEP_STATES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
];
export function validateRuns(runs) {
  if (!Array.isArray(runs) || runs.length > 100)
    throw Error("Historico de execucoes invalido.");
  const ids = new Set();
  for (const run of runs) {
    if (
      typeof run.id !== "string" ||
      ids.has(run.id) ||
      !RUN_STATES.includes(run.status) ||
      typeof run.goal !== "string" ||
      typeof run.summary !== "string" ||
      typeof run.createdAt !== "string" ||
      typeof run.updatedAt !== "string" ||
      typeof run.error !== "string" ||
      !Array.isArray(run.steps) ||
      run.steps.length > 8
    )
      throw Error("Execucao invalida.");
    ids.add(run.id);
    for (const step of run.steps) {
      validateStep({ tool: step.tool, args: step.args });
      if (
        !STEP_STATES.includes(step.status) ||
        typeof step.output !== "string" ||
        step.output.length > 20000
      )
        throw Error("Etapa invalida.");
    }
  }
}
