import {
  PANELS,
  VIEWS,
  THEMES,
  initialState,
  validateState,
  normalize,
  textValue,
  canonical,
  sha256,
  verifyAudit,
} from "./model.mjs";

function panelFrom(text) {
  if (/tarefa|agenda|pendencia/.test(text)) return "tasks";
  if (/memoria|lembranca/.test(text)) return "memory";
  if (/auditoria|historico|registro/.test(text)) return "audit";
  if (/conex|integrac|provedor/.test(text)) return "connections";
  if (/config|ajuste/.test(text)) return "settings";
  if (/briefing|resumo|meu dia/.test(text)) return "briefing";
  return null;
}
function openPanel(state, key) {
  if (!Object.hasOwn(PANELS, key)) throw Error("Painel nao autorizado.");
  if (!state.panels.includes(key))
    state.panels = [...state.panels, key].slice(-4);
  state.focus = false;
}
function interpret(state, content, id, at) {
  const text = normalize(content);
  const panel = panelFrom(text);
  if (
    /^(?:jarvis[, ]*)?(?:crie|criar|adicione|adicionar|nova|novo)\s+(?:uma\s+)?tarefa\b/.test(
      text,
    )
  ) {
    const title = content
      .replace(
        /^(?:jarvis[, ]*)?(?:crie|criar|adicione|adicionar|nova|novo)\s+(?:uma\s+)?tarefa\s*[:\-]?\s*/i,
        "",
      )
      .trim();
    if (!title)
      return {
        status: "declined",
        message: "Qual tarefa voce quer guardar?",
        capability: "task.create",
      };
    if (state.tasks.length >= 1000)
      throw Error("Limite de tarefas locais atingido.");
    state.tasks.unshift({ id, text: title, done: false, createdAt: at });
    openPanel(state, "tasks");
    return {
      status: "completed",
      message: `Tarefa salva: ${title}. Deixei suas tarefas na tela.`,
      capability: "task.create",
    };
  }
  if (
    /^(?:jarvis[, ]*)?(?:lembre|lembra|guarde|guardar)\s+(?:que\s+)?/.test(text)
  ) {
    const fact = content
      .replace(
        /^(?:jarvis[, ]*)?(?:lembre|lembra|guarde|guardar)\s+(?:que\s+)?/i,
        "",
      )
      .trim();
    if (!fact)
      return {
        status: "declined",
        message: "O que voce quer que eu lembre?",
        capability: "memory.create",
      };
    if (state.memories.length >= 1000)
      throw Error("Limite de memorias locais atingido.");
    state.memories.unshift({ id, text: fact, source: "Voce", createdAt: at });
    openPanel(state, "memory");
    return {
      status: "completed",
      message:
        "Guardei essa memoria neste dispositivo. Ela esta na tela para voce conferir.",
      capability: "memory.create",
    };
  }
  if (/fech|ocult|escond/.test(text) && panel) {
    state.panels = state.panels.filter((item) => item !== panel);
    return {
      status: "completed",
      message: `${PANELS[panel]} fechado.`,
      capability: "screen.close",
    };
  }
  if (/foco|limpe a tela|so o nucleo/.test(text)) {
    state.focus = true;
    state.view = "central";
    return {
      status: "completed",
      message: "Modo foco ativo. Os paineis continuam salvos.",
      capability: "screen.focus",
    };
  }
  if (/restaure a tela|sair do foco|voltar ao painel/.test(text)) {
    state.focus = false;
    return {
      status: "completed",
      message: "Central restaurada.",
      capability: "screen.restore",
    };
  }
  if (
    /tema|cor|nucleo/.test(text) &&
    /azul|ciano|cyan|ambar|dourad|laranja/.test(text)
  ) {
    state.settings.theme = /azul|ciano|cyan/.test(text) ? "cyan" : "amber";
    return {
      status: "completed",
      message: "Paleta do nucleo e dos paineis atualizada.",
      capability: "appearance.theme",
    };
  }
  if (panel) {
    openPanel(state, panel);
    const message =
      panel === "briefing"
        ? `Voce tem ${state.tasks.filter((task) => !task.done).length} tarefa(s) aberta(s) e ${state.memories.length} memoria(s) neste dispositivo. Ainda nao ha agenda ou e-mail conectados.`
        : `${PANELS[panel]} na tela. ${panel === "connections" ? "Nenhum provedor externo foi conectado ainda." : ""}`;
    return { status: "completed", message, capability: "screen.open" };
  }
  if (/^(oi|ola|bom dia|boa tarde|boa noite|jarvis)[!.? ]*$/.test(text))
    return {
      status: "completed",
      message: `Estou aqui, ${state.settings.name}. Podemos organizar sua tela, tarefas e memorias locais.`,
      capability: "conversation.local",
    };
  if (/quem (e|sou)|meu nome|lembra de mim/.test(text))
    return {
      status: "completed",
      message: `Seu perfil local esta como ${state.settings.name}. Tenho ${state.memories.length} memoria(s) registrada(s) por voce.`,
      capability: "memory.read",
    };
  return {
    status: "unsupported",
    message:
      "Ainda estou no nucleo local de comandos, sem uma IA externa conectada. Posso mostrar tarefas, memorias, briefing e auditoria, criar uma tarefa ou organizar a tela.",
    capability: "conversation.unsupported",
  };
}

export class JarvisEngine {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.queue = Promise.resolve();
    this.now = options.now || (() => new Date().toISOString());
    this.id = options.id || (() => crypto.randomUUID());
  }
  async read() {
    const state = (await this.storage.read()) || initialState();
    validateState(state);
    if (!(await verifyAudit(state)))
      throw Error(
        "O registro local de auditoria nao passou na verificacao. Os dados foram preservados.",
      );
    return state;
  }
  execute(action) {
    const task = this.queue.then(() => this.apply(action));
    this.queue = task.catch(() => {});
    return task;
  }
  async apply(action) {
    if (
      !action ||
      typeof action !== "object" ||
      typeof action.type !== "string"
    )
      throw Error("Comando invalido.");
    const current = await this.read();
    const state = structuredClone(current);
    const at = this.now();
    const id = this.id();
    let reply = "";
    let status = "completed";
    let capability = action.type;
    let detail = "";
    switch (action.type) {
      case "chat.send": {
        const content = textValue(action.content);
        const result = interpret(state, content, id, at);
        reply = result.message;
        status = result.status;
        capability = result.capability;
        state.messages.push(
          { id: this.id(), role: "user", content, at },
          { id: this.id(), role: "jarvis", content: reply, at },
        );
        state.messages = state.messages.slice(-200);
        detail = "Comando recebido na conversa";
        break;
      }
      case "screen.view":
        if (!VIEWS.includes(action.view)) throw Error("Vista desconhecida.");
        state.view = action.view;
        state.focus = false;
        detail = action.view;
        break;
      case "screen.open":
        openPanel(state, action.panel);
        detail = PANELS[action.panel];
        break;
      case "screen.close":
        if (!Object.hasOwn(PANELS, action.panel))
          throw Error("Painel desconhecido.");
        state.panels = state.panels.filter((key) => key !== action.panel);
        detail = PANELS[action.panel];
        break;
      case "screen.move": {
        const index = state.panels.indexOf(action.panel);
        if (index < 0 || ![-1, 1].includes(action.direction))
          throw Error("Movimento invalido.");
        const target = index + action.direction;
        if (target >= 0 && target < state.panels.length)
          [state.panels[index], state.panels[target]] = [
            state.panels[target],
            state.panels[index],
          ];
        detail = PANELS[action.panel];
        break;
      }
      case "screen.focus":
        if (typeof action.value !== "boolean") throw Error("Modo invalido.");
        state.focus = action.value;
        state.view = "central";
        detail = action.value ? "Foco" : "Central";
        break;
      case "task.create":
        if (state.tasks.length >= 1000) throw Error("Limite de tarefas.");
        state.tasks.unshift({
          id,
          text: textValue(action.text, 500),
          done: false,
          createdAt: at,
        });
        detail = "Tarefa criada";
        break;
      case "task.toggle": {
        const item = state.tasks.find((item) => item.id === action.id);
        if (!item) throw Error("Tarefa nao encontrada.");
        item.done = !item.done;
        detail = item.done ? "Tarefa concluida" : "Tarefa reaberta";
        break;
      }
      case "task.remove":
        if (action.confirmed !== true) throw Error("Confirme a exclusao.");
        if (!state.tasks.some((item) => item.id === action.id))
          throw Error("Tarefa nao encontrada.");
        state.tasks = state.tasks.filter((item) => item.id !== action.id);
        detail = "Tarefa excluida";
        break;
      case "memory.create":
        if (state.memories.length >= 1000) throw Error("Limite de memorias.");
        state.memories.unshift({
          id,
          text: textValue(action.text),
          source: "Voce",
          createdAt: at,
        });
        detail = "Memoria registrada";
        break;
      case "memory.remove":
        if (action.confirmed !== true) throw Error("Confirme a exclusao.");
        if (!state.memories.some((item) => item.id === action.id))
          throw Error("Memoria nao encontrada.");
        state.memories = state.memories.filter((item) => item.id !== action.id);
        detail = "Memoria esquecida";
        break;
      case "settings.update": {
        const changes = action.changes;
        if (!changes || typeof changes !== "object")
          throw Error("Ajustes invalidos.");
        for (const key of Object.keys(changes)) {
          if (
            !["name", "theme", "motion", "sound", "voice", "quality"].includes(
              key,
            )
          )
            throw Error("Ajuste nao autorizado.");
          if (key === "name") state.settings.name = textValue(changes[key], 60);
          else if (key === "theme") {
            if (!THEMES.includes(changes[key])) throw Error("Paleta invalida.");
            state.settings.theme = changes[key];
          } else if (key === "quality") {
            if (!["balanced", "economy"].includes(changes[key]))
              throw Error("Qualidade invalida.");
            state.settings.quality = changes[key];
          } else {
            if (typeof changes[key] !== "boolean")
              throw Error("Opcao invalida.");
            state.settings[key] = changes[key];
          }
        }
        detail = Object.keys(changes).join(", ");
        break;
      }
      case "audit.check":
        detail = "Cadeia local verificada";
        reply =
          "O registro local esta consistente. Esta verificacao nao e uma auditoria externa de seguranca.";
        break;
      default:
        throw Error("Acao nao permitida.");
    }
    state.revision++;
    const payload = {
      id,
      sequence: state.revision,
      at,
      type: capability,
      status,
      detail,
      previous: state.audit.at(-1)?.hash || state.anchor,
    };
    state.audit.push({ ...payload, hash: await sha256(canonical(payload)) });
    if (state.audit.length > 1000) state.anchor = state.audit.shift().hash;
    validateState(state);
    await this.storage.save(current.revision, state);
    return { state, reply, status };
  }
}
