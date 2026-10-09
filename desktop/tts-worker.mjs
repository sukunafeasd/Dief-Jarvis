// SPDX-License-Identifier: GPL-3.0-or-later
import { parentPort, workerData } from "node:worker_threads";
import { NeuralVoice } from "./neural-voice.mjs";
const voice = new NeuralVoice(workerData.root);
parentPort.on("message", async ({ id, text, profile, speed }) => {
  try {
    const wav = await voice.speak(text, profile, speed);
    parentPort.postMessage({ id, wav });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message });
  }
});
