import { validateRuns } from "./tools.mjs";

export const PANELS = Object.freeze({
  tasks: "Tarefas",
  memory: "Memoria",
  audit: "Auditoria",
  connections: "Conexoes",
  settings: "Ajustes",
  briefing: "Briefing",
});
export const VIEWS = [
  "central",
  "conversation",
  "tasks",
  "memory",
  "audit",
  "connections",
  "agent",
  "settings",
];
export const THEMES = ["amber", "cyan"];
export const ZERO_HASH = "0".repeat(64);
export const ACCESS_DEFAULTS = Object.freeze({
  mode: "restricted",
  web: false,
  files: false,
  desktop: false,
  commands: false,
  admin: false,
});
export const VOICE_DEFAULTS = Object.freeze({
  voiceEngine: "neural",
  voiceProfile: "dief_pt",
  voicePresetVersion: 1,
  presentation: "voice",
  voiceURI: "",
  voiceLang: "pt-BR",
  voiceRate: 0.96,
  voicePitch: 0.9,
  voiceVolume: 0.85,
  azureVoice: "pt-BR-AntonioNeural",
  motionMode: "always",
  displayPresetVersion: 1,
  listenOnLaunch: true,
  listenInBackground: true,
  autoMemory: true,
  voiceEffects: true,
  voiceMode: "auto",
  autoPin: true,
  intensity: 1,
});

export function initialState() {
  return {
    schema: 1,
    revision: 0,
    view: "central",
    panels: [],
    focus: false,
    settings: {
      name: "Cafe",
      city: "",
      theme: "amber",
      motion: true,
      sound: false,
      voice: false,
      quality: "balanced",
      ...VOICE_DEFAULTS,
      access: { ...ACCESS_DEFAULTS },
    },
    tasks: [],
    runs: [],
    cards: [],
    pins: [],
    agent: { provider: "local", model: "", workspace: "", autonomy: false },
    memories: [],
    messages: [],
    audit: [],
    anchor: ZERO_HASH,
  };
}
export function validateState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state))
    throw Error("Estado local invalido.");
  validateRuns(state.runs || []);
  if (
    state.pins !== undefined &&
    (!Array.isArray(state.pins) ||
      state.pins.length > 6 ||
      new Set(state.pins).size !== state.pins.length ||
      state.pins.some(
        (topic) =>
          ![
            "tasks",
            "weather",
            "news",
            "activity",
            "status",
            "memory",
          ].includes(topic),
      ))
  )
    throw Error("Topicos fixados invalidos.");
  const agent = state.agent || { provider: "local", model: "", workspace: "" };
  if (
    !["local", "ollama"].includes(agent.provider) ||
    typeof agent.model !== "string" ||
    agent.model.length > 120 ||
    typeof agent.workspace !== "string" ||
    agent.workspace.length > 1000
  )
    throw Error("Configuracao do agente invalida.");
  if (agent.autonomy !== undefined && typeof agent.autonomy !== "boolean")
    throw Error("Autonomia invalida.");
  if (
    state.cards !== undefined &&
    (!Array.isArray(state.cards) ||
      state.cards.length > 6 ||
      state.cards.some(
        (item) =>
          !item ||
          typeof item.id !== "string" ||
          typeof item.title !== "string" ||
          item.title.length > 100 ||
          typeof item.value !== "string" ||
          item.value.length > 2000 ||
          typeof item.unit !== "string" ||
          item.unit.length > 50 ||
          typeof item.source !== "string" ||
          item.source.length > 2000 ||
          typeof item.at !== "string" ||
          (item.kind !== undefined &&
            ![
              "tasks",
              "weather",
              "news",
              "activity",
              "status",
              "memory",
            ].includes(item.kind)) ||
          (item.weatherCode !== undefined &&
            (!Number.isInteger(item.weatherCode) ||
              item.weatherCode < 0 ||
              item.weatherCode > 99)),
      ))
  )
    throw Error("Dados de tela invalidos.");
  if (
    !state ||
    state.schema !== 1 ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0 ||
    !VIEWS.includes(state.view) ||
    !Array.isArray(state.panels) ||
    state.panels.length > 4 ||
    new Set(state.panels).size !== state.panels.length ||
    state.panels.some((key) => !Object.hasOwn(PANELS, key)) ||
    !THEMES.includes(state.settings?.theme) ||
    typeof state.settings?.name !== "string" ||
    typeof state.focus !== "boolean" ||
    typeof state.settings?.motion !== "boolean" ||
    typeof state.settings?.sound !== "boolean" ||
    typeof state.settings?.voice !== "boolean" ||
    !["balanced", "economy"].includes(state.settings?.quality)
  )
    throw Error("Estado local invalido. Os dados foram preservados.");
  for (const [key, limit] of [
    ["tasks", 1000],
    ["memories", 1000],
    ["messages", 200],
    ["audit", 1000],
  ]) {
    if (!Array.isArray(state[key]) || state[key].length > limit)
      throw Error("Dados locais fora do formato esperado.");
  }
  const options = { ...VOICE_DEFAULTS, ...state.settings };
  if (
    typeof options.listenOnLaunch !== "boolean" ||
    typeof options.listenInBackground !== "boolean" ||
    typeof options.autoMemory !== "boolean" ||
    typeof options.voiceEffects !== "boolean" ||
    typeof options.autoPin !== "boolean" ||
    ![
      "auto",
      "normal",
      "informative",
      "confirmation",
      "analysis",
      "warning",
      "urgent",
      "humor",
      "greeting",
      "low_priority",
    ].includes(options.voiceMode)
  )
    throw Error("Preferencias do nucleo invalidas.");
  if (
    state.settings.city !== undefined &&
    (typeof state.settings.city !== "string" ||
      state.settings.city.length > 100)
  )
    throw Error("Cidade invalida.");
  if (
    !["voice", "workspace"].includes(options.presentation) ||
    !["system", "neural", "azure"].includes(options.voiceEngine) ||
    !["pt-BR-AntonioNeural", "pt-BR-CaioNeural"].includes(options.azureVoice) ||
    !["dief_pt", "pm_alex", "pm_santa", "bm_george"].includes(
      options.voiceProfile,
    ) ||
    options.voicePresetVersion !== 1 ||
    options.displayPresetVersion !== 1 ||
    !["system", "always"].includes(options.motionMode) ||
    !["pt-BR", "en-GB"].includes(options.voiceLang) ||
    typeof options.voiceURI !== "string" ||
    options.voiceURI.length > 500 ||
    !Number.isFinite(options.voiceRate) ||
    options.voiceRate < 0.6 ||
    options.voiceRate > 1.4 ||
    !Number.isFinite(options.voicePitch) ||
    options.voicePitch < 0.5 ||
    options.voicePitch > 1.5 ||
    !Number.isFinite(options.voiceVolume) ||
    options.voiceVolume < 0 ||
    options.voiceVolume > 1 ||
    !Number.isFinite(options.intensity) ||
    options.intensity < 0.5 ||
    options.intensity > 1.5
  )
    throw Error("Configuracao de voz ou movimento invalida.");
  const access = { ...ACCESS_DEFAULTS, ...state.settings.access };
  if (
    !["restricted", "supervised", "full"].includes(access.mode) ||
    ["web", "files", "desktop", "commands", "admin"].some(
      (key) => typeof access[key] !== "boolean",
    )
  )
    throw Error("Politica de acesso invalida.");
  for (const task of state.tasks)
    if (
      typeof task.id !== "string" ||
      typeof task.text !== "string" ||
      typeof task.done !== "boolean"
    )
      throw Error("Tarefa invalida.");
  for (const item of state.memories)
    if (typeof item.id !== "string" || typeof item.text !== "string")
      throw Error("Memoria invalida.");
  for (const item of state.messages)
    if (
      !["user", "jarvis"].includes(item.role) ||
      typeof item.content !== "string"
    )
      throw Error("Mensagem invalida.");
  if (!/^[a-f0-9]{64}$/.test(state.anchor))
    throw Error("Ancora de auditoria invalida.");
  return state;
}
export function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function textValue(value, max = 4000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error("Informe um texto valido dentro do limite deste comando.");
  return value.trim();
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export async function sha256(text) {
  const bytes = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function verifyAudit(state) {
  validateState(state);
  let previous = state.anchor;
  let seq = null;
  for (const record of state.audit) {
    const { hash, ...payload } = record;
    if (
      record.previous !== previous ||
      (seq !== null && record.sequence !== seq + 1) ||
      !Number.isSafeInteger(record.sequence) ||
      hash !== (await sha256(canonical(payload)))
    )
      return false;
    previous = hash;
    seq = record.sequence;
  }
  return state.audit.length === 0
    ? state.revision === 0
    : seq === state.revision;
}
