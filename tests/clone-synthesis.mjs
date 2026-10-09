import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { ClonedVoice } from "../desktop/clone-voice.mjs";
const voice = new ClonedVoice();
try {
  const start = performance.now();
  const wav = await voice.speak(
    "Boa noite. Estou aqui para organizar suas tarefas. Diga o que precisa fazer.",
    "reference",
    0.96,
  );
  await fs.writeFile("artifacts/jarvis-cloned-sample.wav", wav);
  const seconds = (wav.length - 44) / 48000;
  if (wav.toString("ascii", 0, 4) !== "RIFF" || seconds < 1)
    throw Error("Sintese nao produziu WAV valido.");
  console.log(
    JSON.stringify({
      status: "PASS",
      engine: "XTTS-v2",
      source: "local reference",
      bytes: wav.length,
      approximateSeconds: seconds,
      coldSynthesisMs: Math.round(performance.now() - start),
      physicalMicrophoneUsed: false,
    }),
  );
  const warm = performance.now();
  const reply = await voice.speak(
    "Entendido. Vou verificar.",
    "reference",
    0.96,
  );
  await fs.writeFile("artifacts/jarvis-cloned-short.wav", reply);
  console.log(
    JSON.stringify({
      status: "PASS",
      warmSynthesisMs: Math.round(performance.now() - warm),
      bytes: reply.length,
    }),
  );
} finally {
  await voice.stop();
}
