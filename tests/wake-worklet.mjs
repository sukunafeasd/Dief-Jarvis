import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { ComponentInstaller } from "../desktop/components.mjs";
if (!(await new ComponentInstaller().status()).ready)
  throw Error("Prepare os modelos locais primeiro.");
const server = await createServer({
  cacheDir: "node_modules/.vite/test-wake",
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Users/cafe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
        : undefined),
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-audio-capture=${path.resolve("artifacts/jarvis-wake-pt.wav")}`,
    ],
  });
  const context = await browser.newContext({ permissions: ["microphone"] }),
    page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.evaluate(async () => {
    const { WakeListener } = await import("/src/wake-listener.mjs");
    window.wakeErrors = [];
    window.wakeCommands = [];
    window.wakeLevels = 0;
    window.capture = new WakeListener({
      modelUrl: "/__jarvis_voice/stt-pt.tar.gz",
      keywordUrl: "/__jarvis_voice/stt-wake-en.tar.gz",
      onCommand: (command) => window.wakeCommands.push(command),
      onState: (state) => {
        window.wakeState = state;
      },
      onLevel: (level) => {
        window.wakeLevels = Math.max(window.wakeLevels, level);
      },
      onError: (error) => window.wakeErrors.push(error),
    });
    await window.capture.start();
  });
  await page.waitForFunction(
    () => window.wakeCommands.length || window.wakeErrors.length,
    { timeout: 45000 },
  );
  const result = await page.evaluate(() => {
    const tracks = window.capture.stream?.getTracks() || [];
    window.capture.stop();
    return {
      commands: window.wakeCommands,
      errors: window.wakeErrors,
      level: window.wakeLevels,
      stopped: tracks.every((track) => track.readyState === "ended"),
      state: window.wakeState,
    };
  });
  assert.deepEqual(result.errors, []);
  assert.ok(
    result.commands.some((text) => text.includes("minhas tarefas")),
    JSON.stringify(result),
  );
  assert.ok(result.level > 0);
  assert.ok(result.stopped);
  assert.equal(result.state, "off");
  console.log(
    "PASS: synthetic microphone -> AudioWorklet -> dual offline models -> addressed command; stopping ends every capture track. No physical microphone used.",
  );
} finally {
  await browser?.close();
  await server.close();
}
