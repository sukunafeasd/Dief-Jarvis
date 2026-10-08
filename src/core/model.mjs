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
  "settings",
];
export const THEMES = ["amber", "cyan"];
export const ZERO_HASH = "0".repeat(64);

export function initialState() {
  return {
    schema: 1,
    revision: 0,
    view: "central",
    panels: [],
    focus: false,
    settings: {
      name: "Cafe",
      theme: "amber",
      motion: true,
      sound: false,
      voice: false,
      quality: "balanced",
    },
    tasks: [],
    memories: [],
    messages: [],
    audit: [],
    anchor: ZERO_HASH,
  };
}
export function validateState(state) {
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
