export async function publicJson(url, signal, fetcher = fetch) {
  const response = await fetcher(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    redirect: "error",
  });
  if (!response.ok || !response.body)
    throw Error(`Servico indisponivel: HTTP ${response.status}`);
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 64000) throw Error("Resposta externa grande demais.");
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
  }
}
