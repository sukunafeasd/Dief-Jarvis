export function pronunciationText(text) {
  const words = {
    nao: "não",
    voce: "você",
    voces: "vocês",
    configuracao: "configuração",
    disposicao: "disposição",
    previsao: "previsão",
    portugues: "português",
    autorizacao: "autorização",
    conexoes: "conexões",
    execucoes: "execuções",
    memoria: "memória",
    memorias: "memórias",
    horario: "horário",
    quilometros: "quilômetros",
    amanha: "amanhã",
    informacoes: "informações",
    instrucoes: "instruções",
  };
  return text.replace(
    /\b[a-z]+\b/gi,
    (word) => words[word.toLowerCase()] || word,
  );
}
export function speechChunks(text, limit = 140) {
  if (
    typeof text !== "string" ||
    !text.trim() ||
    text.length > 4000 ||
    !Number.isInteger(limit) ||
    limit < 30 ||
    limit > 500
  )
    throw Error("Texto de voz invalido.");
  const spoken = text
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/\*\*|__/g, "")
    .replace(/°\s*C\b/g, " graus Celsius")
    .replace(/(\d)\s*%/g, "$1 por cento")
    .replace(/(\d)\s*km\b/gi, "$1 quilometros")
    .trim();
  const chunks = [];
  let chunk = "";
  for (const word of spoken.split(/\s+/)) {
    if (word.length > limit) throw Error("Palavra longa demais para sintese.");
    if (chunk && chunk.length + word.length + 1 > limit) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += (chunk ? " " : "") + word;
    if (/[.!?;]$/.test(word) && chunk.length >= 30) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  if (chunk) chunks.push(chunk);
  if (!chunks.length) throw Error("Texto sem conteudo pronunciavel.");
  return chunks;
}
