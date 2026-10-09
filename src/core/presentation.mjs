import { normalize } from "./model.mjs";
export const TOPICS = [
  "tasks",
  "weather",
  "news",
  "activity",
  "status",
  "memory",
];
export function topicFromText(text) {
  const value = normalize(text);
  if (/tarefa|pendencia/.test(value)) return "tasks";
  if (/clima|tempo|temperatura|previsao/.test(value)) return "weather";
  if (/noticia|jornal/.test(value)) return "news";
  if (/corrida|corri|exercicio|atividade fisica/.test(value)) return "activity";
  if (/status|hardware|memoria ram|sistema/.test(value)) return "status";
  if (/memoria|lembra|nucleo/.test(value)) return "memory";
  return null;
}
export function cardTopic(card) {
  if (TOPICS.includes(card.kind)) return card.kind;
  if (/Open-Meteo/i.test(card.source)) return "weather";
  if (/Hacker News/i.test(card.source)) return "news";
  if (/km|^m$/.test(card.unit) || /corrida/i.test(card.title))
    return "activity";
  return "status";
}
export function availableTopics(state) {
  return [
    ...new Set([
      ...(state.pins || []),
      ...(state.tasks.length ? ["tasks"] : []),
      ...(state.memories.length ? ["memory"] : []),
      ...state.panels.filter((topic) => ["tasks", "memory"].includes(topic)),
      ...(state.cards || []).map(cardTopic),
    ]),
  ];
}
export function weatherScene(code) {
  if (!Number.isInteger(code)) return "weather";
  if (code === 0 || code === 1) return "sun";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if (code >= 51) return "rain";
  return "cloud";
}
export function presentationFor(state, selected) {
  if (state.focus) return null;
  const requested = topicFromText(
    state.messages.filter((message) => message.role === "user").at(-1)
      ?.content || "",
  );
  let topic = selected || requested;
  if (
    !selected &&
    topic === "tasks" &&
    !state.panels.includes("tasks") &&
    !(state.pins || []).includes("tasks")
  )
    topic = null;
  if (
    !selected &&
    topic === "memory" &&
    !state.panels.includes("memory") &&
    !(state.pins || []).includes("memory")
  )
    topic = null;
  if (!topic || !TOPICS.includes(topic))
    topic = state.panels.includes("tasks")
      ? "tasks"
      : state.pins?.[0]
        ? state.pins[0]
        : state.cards[0]
          ? cardTopic(state.cards[0])
          : state.panels.includes("memory")
            ? "memory"
            : null;
  if (!topic) return null;
  const cards = (state.cards || []).filter((card) => cardTopic(card) === topic);
  const data =
    topic === "tasks"
      ? state.tasks
      : topic === "memory"
        ? state.memories
        : cards;
  const labels = {
    tasks: "Suas tarefas",
    weather: "Atmosfera",
    news: "Jornal de tecnologia",
    activity: "Atividade informada",
    status: "Sistema",
    memory: "Nucleo de memoria",
  };
  const items = data.slice(0, 20).map((item) => ({
    id: item.id,
    title: topic === "news" ? item.value : item.text || item.title,
    value: topic === "news" ? undefined : item.value,
    unit: item.unit === "C" ? "°C" : item.unit,
    done: item.done,
    source:
      item.source || (topic === "memory" ? "Memoria local" : "Tarefas locais"),
    at: item.at || item.createdAt,
  }));
  return {
    topic,
    title: labels[topic],
    scene: topic === "weather" ? weatherScene(cards[0]?.weatherCode) : topic,
    items,
    key: `${topic}:${items.map((item) => item.id).join(":")}`,
  };
}
export function spokenItem(deck, segment) {
  if (!deck?.items.length || !segment) return -1;
  const text = normalize(segment.text || "");
  const index = deck.items.findIndex((item) => {
    const title = normalize(item.title);
    return (
      title.length > 3 &&
      (text.includes(title) ||
        title
          .split(/\s+/)
          .filter((word) => word.length > 4 && text.includes(word)).length >= 2)
    );
  });
  return index >= 0
    ? index
    : Math.min(
        deck.items.length - 1,
        Math.floor(
          (segment.index / Math.max(1, segment.total)) * deck.items.length,
        ),
      );
}
export function learnPinnedTopic(state, content) {
  if (state.settings.autoPin === false) return;
  const topic = topicFromText(content);
  if (!topic || (state.pins || []).includes(topic)) return;
  if (
    !["tasks", "memory"].includes(topic) &&
    !(state.cards || []).some((card) => cardTopic(card) === topic)
  )
    return;
  const visits = state.messages.filter(
    (message) =>
      message.role === "user" &&
      topicFromText(message.content) === topic &&
      !/fix|desfix|retir/.test(normalize(message.content)),
  );
  if (visits.length < 3) return;
  state.pins = [...(state.pins || []), topic].slice(-6);
}
