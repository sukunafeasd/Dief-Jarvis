import { publicJson } from "./public-json.mjs";
export async function techHeadlines(signal, fetcher = fetch) {
  const base = "https://hacker-news.firebaseio.com/v0/";
  const ids = await publicJson(base + "topstories.json", signal, fetcher);
  if (
    !Array.isArray(ids) ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    throw Error("Feed de noticias invalido.");
  const headlines = [];
  for (const id of ids.slice(0, 8)) {
    signal.throwIfAborted();
    const item = await publicJson(base + `item/${id}.json`, signal, fetcher);
    if (
      item?.type !== "story" ||
      item.deleted ||
      item.dead ||
      typeof item.title !== "string" ||
      !Number.isFinite(item.time)
    )
      continue;
    headlines.push({
      title: item.title.slice(0, 300),
      source: `https://news.ycombinator.com/item?id=${id}`,
      publishedAt: new Date(item.time * 1000).toISOString(),
    });
    if (headlines.length === 3) break;
  }
  if (!headlines.length) throw Error("Nenhuma manchete valida disponivel.");
  return headlines;
}
