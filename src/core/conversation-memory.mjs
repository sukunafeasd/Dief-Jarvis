import { normalize } from "./model.mjs";

// Only direct, durable self-statements are candidates, never assistant output.
export function conversationFacts(content) {
  if (
    typeof content !== "string" ||
    content.length > 4000 ||
    /[?"`<>]|senha|password|token|segredo|cpf|cartao|cartão|diagnostic|doenc|doenç|relig|politic|polític/i.test(
      content,
    )
  )
    return [];
  const facts = [];
  for (const sentence of content.split(/[.!;\n]+/).slice(0, 8)) {
    const text = sentence.trim();
    if (text.length < 6 || text.length > 260) continue;
    const match = text.match(
      /^(?:eu\s+)?(meu nome (?:e|é)|moro em|trabalho (?:como|com)|gosto de|prefiro|estudo)\s+(.+)$/i,
    );
    if (
      !match ||
      /\b(?:nao|não|talvez|hipoteticamente|exemplo|esque[çc]a|ignore)\b/i.test(
        text,
      )
    )
      continue;
    const prefix = normalize(match[1]);
    const key = prefix.startsWith("meu nome")
      ? "identity:name"
      : prefix === "moro em"
        ? "identity:city"
        : `${prefix}:${normalize(match[2])}`;
    facts.push({ key, text });
  }
  return facts.slice(0, 3);
}
export function rememberConversation(state, content, at, id) {
  if (state.settings.autoMemory === false) return 0;
  let count = 0;
  for (const fact of conversationFacts(content)) {
    if (
      state.memories.some(
        (memory) => normalize(memory.text) === normalize(fact.text),
      )
    )
      continue;
    const old = state.memories.findIndex(
      (memory) => memory.automaticKey === fact.key,
    );
    if (old >= 0) state.memories.splice(old, 1);
    if (state.memories.length >= 1000) break;
    state.memories.unshift({
      id: id(),
      text: fact.text,
      source: "Conversa / declarado por voce",
      createdAt: at,
      automaticKey: fact.key,
    });
    count++;
  }
  return count;
}
