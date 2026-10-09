import { textValue, normalize } from "./model.mjs";

const text = (max) => ({ type: "string", minLength: 1, maxLength: max });
const spec = (title, permission, native, fields, risk = "write") =>
  Object.freeze({
    title,
    permission,
    native,
    risk,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: fields,
      required: Object.keys(fields),
    },
  });
export const TOOLS = Object.freeze({
  "task.create": spec("Criar tarefa", null, false, { text: text(500) }),
  "task.list": spec("Consultar tarefas e seus IDs", null, false, {}, "read"),
  "task.search": spec(
    "Buscar tarefas e seus IDs",
    null,
    false,
    { query: text(200) },
    "read",
  ),
  "task.complete": spec("Concluir tarefa", null, false, { id: text(100) }),
  "memory.create": spec("Guardar memoria", null, false, { text: text(4000) }),
  "screen.pin": spec("Fixar ou desfixar topico da central", null, false, {
    topic: {
      type: "string",
      enum: ["tasks", "weather", "news", "activity", "status", "memory"],
    },
    mode: { type: "string", enum: ["pin", "unpin"] },
  }),
  "memory.search": spec(
    "Consultar memorias",
    null,
    false,
    { query: text(200) },
    "read",
  ),
  "screen.open": spec(
    "Mostrar painel",
    null,
    false,
    {
      panel: {
        type: "string",
        enum: [
          "tasks",
          "memory",
          "audit",
          "briefing",
          "connections",
          "settings",
        ],
      },
    },
    "read",
  ),
  "workspace.list": spec(
    "Listar pasta do computador",
    "files",
    true,
    {
      path: text(2048),
    },
    "read",
  ),
  "workspace.read": spec(
    "Ler arquivo de texto",
    "files",
    true,
    {
      path: text(2048),
    },
    "read",
  ),
  "workspace.create": spec("Criar arquivo de texto", "files", true, {
    path: text(2048),
    content: text(16000),
  }),
  "workspace.trash": spec(
    "Enviar arquivo para a Lixeira",
    "files",
    true,
    {
      path: text(2048),
    },
    "sensitive",
  ),
  "web.search": spec(
    "Abrir pesquisa no navegador",
    "web",
    true,
    {
      query: text(300),
    },
    "read",
  ),
  "web.open": spec(
    "Abrir pagina no navegador agente",
    "web",
    true,
    { url: text(2000) },
    "read",
  ),
  "web.observe": spec("Observar pagina do agente", "web", true, {}, "read"),
  "web.click": spec(
    "Clicar na pagina",
    "web",
    true,
    { ref: text(80) },
    "interaction",
  ),
  "web.fill": spec(
    "Preencher campo da pagina",
    "web",
    true,
    { ref: text(80), text: text(2000) },
    "interaction",
  ),
  "desktop.list": spec("Listar janelas do PC", "desktop", true, {}, "read"),
  "desktop.observe": spec(
    "Observar controles da janela",
    "desktop",
    true,
    { window: text(50) },
    "read",
  ),
  "desktop.focus": spec(
    "Trazer janela para frente",
    "desktop",
    true,
    { window: text(50) },
    "interaction",
  ),
  "desktop.invoke": spec(
    "Acionar controle da janela",
    "desktop",
    true,
    { window: text(50), ref: text(100) },
    "interaction",
  ),
  "desktop.type": spec(
    "Preencher campo do aplicativo",
    "desktop",
    true,
    { window: text(50), ref: text(100), text: text(2000) },
    "interaction",
  ),
  "weather.current": spec(
    "Consultar tempo da cidade",
    "web",
    true,
    { city: text(100) },
    "read",
  ),
  "weather.forecast": spec(
    "Consultar previsao de sete dias",
    "web",
    true,
    { city: text(100) },
    "read",
  ),
  "system.hardware": spec(
    "Consultar hardware e memoria reais",
    "desktop",
    true,
    {},
    "read",
  ),
  "command.execute": spec(
    "Executar comando PowerShell com aprovacao",
    "commands",
    true,
    { script: text(8000), directory: text(2048) },
    "sensitive",
  ),
  "news.headlines": spec(
    "Consultar manchetes de tecnologia / Hacker News",
    "web",
    true,
    {},
    "read",
  ),
  "screen.metric": spec(
    "Mostrar medida informada",
    null,
    false,
    { title: text(80), value: text(30), unit: text(30) },
    "read",
  ),
  "system.status": spec(
    "Mostrar estado real do aplicativo",
    null,
    false,
    {},
    "read",
  ),
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
    const taskSearch = part.match(
      /^(?:busque|procure) (?:a |uma )?tarefa\s*:?\s+(.+)$/i,
    );
    if (taskSearch)
      return { tool: "task.search", args: { query: taskSearch[1].trim() } };
    const memory = part.match(/^lembre que\s+(.+)$/is);
    if (memory)
      return { tool: "memory.create", args: { text: memory[1].trim() } };
    const search = part.match(/^pesquise\s+(.+)$/is);
    if (search)
      return { tool: "web.search", args: { query: search[1].trim() } };
    const site = part.match(/^abra (https:\/\/\S+)$/i);
    if (site) return { tool: "web.open", args: { url: site[1] } };
    if (command === "observe a pagina")
      return { tool: "web.observe", args: {} };
    if (command === "liste janelas") return { tool: "desktop.list", args: {} };
    const weather = part.match(/^(?:tempo|temperatura) (?:em|de)\s+(.+)$/i);
    if (weather) return { tool: "weather.current", args: { city: weather[1] } };
    const forecast = part.match(
      /^previs[aã]o (?:do tempo )?(?:em|de|para)\s+(.+)$/i,
    );
    if (forecast)
      return { tool: "weather.forecast", args: { city: forecast[1] } };
    const memorySearch = part.match(
      /^(?:o que sabe|o que lembra|busque memorias) sobre\s+(.+)$/i,
    );
    if (memorySearch)
      return { tool: "memory.search", args: { query: memorySearch[1] } };
    if (
      /^(?:(?:consulte|liste) (?:minhas |as )?tarefas|quais (?:sao (?:as )?)?tarefas(?: temos)?|quantas tarefas(?: temos)?)$/.test(
        command,
      )
    )
      return { tool: "task.list", args: {} };
    const complete = part.match(/^conclua tarefa\s+(.+)$/i);
    if (complete)
      return { tool: "task.complete", args: { id: complete[1].trim() } };
    if (
      /^(?:mostre |consulte )?(?:hardware|memoria ram|configuracao do pc)$/.test(
        command,
      )
    )
      return { tool: "system.hardware", args: {} };
    if (/^(?:mostre |leia )?(?:as )?noticias(?: de tecnologia)?$/.test(command))
      return { tool: "news.headlines", args: {} };
    const distance = command.match(
      /^(?:hoje )?(?:eu )?corri\s+(\d+(?:[.,]\d+)?|zero|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s*(km|quilometros|metros|m)(?: hoje)?[.!]*$/,
    );
    const spoken = {
      zero: "0",
      um: "1",
      uma: "1",
      dois: "2",
      duas: "2",
      tres: "3",
      quatro: "4",
      cinco: "5",
      seis: "6",
      sete: "7",
      oito: "8",
      nove: "9",
      dez: "10",
    };
    if (distance)
      return {
        tool: "screen.metric",
        args: {
          title: "Corrida informada na conversa",
          value: spoken[distance[1]] || distance[1].replace(",", "."),
          unit: /^(?:k|quilo)/.test(distance[2]) ? "km" : "m",
        },
      };
    if (/^(?:mostre )?(?:status|estado do sistema)$/.test(command))
      return { tool: "system.status", args: {} };
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
      /^(?:mostre|mostra) (?:minhas? |meus? |a |as |o |os )?(tarefas|memoria|auditoria|briefing|conexoes|ajustes)$/,
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
