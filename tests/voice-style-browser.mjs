import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { VoiceService } from "../desktop/voice-service.mjs";
import { runtimeRoot } from "../desktop/components.mjs";
import { wavEncode } from "../desktop/neural-voice.mjs";
const server = await createServer({
  cacheDir: "node_modules/.vite/test-style",
  server: { host: "127.0.0.1", port: 0 },
});
const voice = new VoiceService(runtimeRoot());
let browser;
try {
  const raw = await voice.speak(
    "Bom dia. Tenho duas tarefas para hoje. A primeira e revisar o projeto. A segunda e testar a nova voz. Nenhuma operacao foi executada sem verificacao.",
    "dief_pt",
    0.94,
  );
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile("artifacts/voice-original-a.wav", raw);
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Users/cafe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
        : undefined),
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  const result = await page.evaluate(async () => {
    const { voiceEffects } = await import("/src/core/voice-style.mjs");
    const wav = await (
      await fetch("/artifacts/voice-original-a.wav")
    ).arrayBuffer();
    const decoder = new AudioContext();
    const buffer = await decoder.decodeAudioData(wav);
    await decoder.close();
    const context = new OfflineAudioContext(
      1,
      buffer.length,
      buffer.sampleRate,
    );
    const source = context.createBufferSource();
    source.buffer = buffer;
    const effects = voiceEffects(context);
    source.connect(effects.input);
    effects.output.connect(context.destination);
    source.start();
    const rendered = await context.startRendering();
    const samples = rendered.getChannelData(0);
    let peak = 0,
      energy = 0;
    for (const sample of samples) {
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    effects.dispose();
    source.disconnect();
    return {
      samples: Array.from(samples),
      rate: rendered.sampleRate,
      peak,
      rms: Math.sqrt(energy / samples.length),
    };
  });
  assert.ok(result.peak > 0.01 && result.peak <= 0.93, `peak=${result.peak}`);
  assert.ok(result.rms > 0.001);
  await fs.writeFile(
    "artifacts/voice-original-b.wav",
    wavEncode(Float32Array.from(result.samples), result.rate),
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      originalProfile: true,
      peak: result.peak,
      rms: result.rms,
      duration: result.samples.length / result.rate,
      actorCloned: false,
      physicalMicrophoneUsed: false,
    }),
  );
} finally {
  await voice.stop();
  await browser?.close();
  await server.close();
}
