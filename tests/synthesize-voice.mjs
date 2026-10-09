import fs from "node:fs/promises";
import { NeuralVoice } from "../desktop/neural-voice.mjs";
import { runtimeRoot, ComponentInstaller } from "../desktop/components.mjs";
if (!(await new ComponentInstaller().status()).ready)
  throw Error("Execute npm run prepare:voice primeiro.");
await fs.mkdir("artifacts", { recursive: true });
const voice = new NeuralVoice(runtimeRoot());
for (const [file, text, profile] of [
  [
    "jarvis-dief-pt",
    "Boa noite, Cafe. Estou a sua disposicao. Vou consultar a previsao do tempo e organizar suas tarefas.",
    "dief_pt",
  ],
  [
    "jarvis-santa",
    "Boa noite, Cafe. Estou a sua disposicao. Vou consultar a previsao do tempo e organizar suas tarefas.",
    "pm_santa",
  ],
  [
    "jarvis-alex",
    "Boa noite. Dief Jarvis esta pronto. Aguardando suas instrucoes.",
    "pm_alex",
  ],
  [
    "jarvis-george",
    "Good evening. I am ready. What would you like me to do?",
    "bm_george",
  ],
  [
    "jarvis-wake-pt",
    "Jarvis, mostre minhas tarefas. Jarvis, hoje eu corri dois quilometros.",
    "pm_alex",
  ],
  [
    "jarvis-no-wake",
    "Hoje eu organizei minhas tarefas e corri dois quilometros.",
    "pm_alex",
  ],
]) {
  const start = performance.now();
  let wav = await voice.speak(text, profile, 0.94);
  if (file === "jarvis-wake-pt") {
    wav = Buffer.concat([wav, Buffer.alloc(96000)]);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.writeUInt32LE(wav.length - 44, 40);
  }
  await fs.writeFile(`artifacts/${file}.wav`, wav);
  console.log(
    JSON.stringify({
      file,
      bytes: wav.length,
      seconds: (wav.length - 44) / 48000,
      synthesisMs: Math.round(performance.now() - start),
    }),
  );
}
