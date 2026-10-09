import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { ComponentInstaller } from "../desktop/components.mjs";
if (!(await new ComponentInstaller().status()).ready)
  throw Error("Prepare os componentes de voz primeiro.");
const server = await createServer({
  cacheDir: "node_modules/.vite/test-stream",
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Users/cafe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
        : undefined),
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => !!window.jarvisPreviewVoice);
  await page.evaluate(async () => {
    const { VoiceChannel } = await import("/src/voice.mjs");
    window.voiceEvidence = {
      events: [],
      requests: [],
      errors: [],
      done: false,
    };
    const evidence = window.voiceEvidence;
    window.jarvisPreviewVoice = {
      speak: async (text, profile, speed) => {
        const record = { text, requestedAt: performance.now() };
        evidence.requests.push(record);
        const response = await fetch("/__jarvis_voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, profile, speed }),
        });
        if (!response.ok) throw Error((await response.json()).error);
        const wav = await response.arrayBuffer();
        record.readyAt = performance.now();
        record.bytes = wav.byteLength;
        return wav;
      },
    };
    const channel = new VoiceChannel({
      onTranscript() {},
      onPhase: (phase) =>
        evidence.events.push({ phase, at: performance.now() }),
      onError: (error) => evidence.errors.push(error),
      onSpokenEnd: () => {
        evidence.done = true;
      },
    });
    window.testVoiceChannel = channel;
    const button = document.createElement("button");
    button.id = "test-real-voice";
    button.textContent = "Reproduzir teste de voz";
    button.style.cssText = "position:fixed;top:10px;left:10px;z-index:1000";
    button.onclick = () =>
      channel.speak(
        "Boa noite, Cafe. Estou a sua disposicao. Vou consultar a previsao do tempo para sua cidade.",
        {
          voiceEngine: "neural",
          voiceProfile: "dief_pt",
          voiceRate: 0.94,
          voiceVolume: 0.1,
        },
      );
    document.body.append(button);
  });
  await page.locator("#test-real-voice").click();
  await page.waitForFunction(
    () => window.voiceEvidence.done || window.voiceEvidence.errors.length,
    null,
    { timeout: 120000 },
  );
  const evidence = await page.evaluate(() => window.voiceEvidence);
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile(
    "artifacts/voice-stream-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
  assert.deepEqual(evidence.errors, []);
  assert.equal(evidence.done, true);
  assert.equal(evidence.requests.length, 2);
  const spoken = evidence.events.filter((item) => item.phase === "speaking");
  assert.equal(spoken.length, 2);
  assert.ok(evidence.requests.every((item) => item.bytes > 10000));
  assert.ok(
    spoken[0].at < evidence.requests[1].readyAt,
    "first part starts before second synthesis is ready",
  );
  await page.evaluate(() => window.testVoiceChannel.dispose());
  console.log(
    JSON.stringify({
      status: "PASS",
      requests: evidence.requests.length,
      firstAudioMs: Math.round(spoken[0].at - evidence.requests[0].requestedAt),
      nextAudioStillPreparing: true,
      physicalMicrophoneUsed: false,
    }),
  );
} finally {
  await browser?.close();
  await server.close();
}
