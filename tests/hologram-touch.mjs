import assert from "node:assert/strict";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
const server = await createServer({
  cacheDir: "node_modules/.vite/test-touch",
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
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  await page.addInitScript(() => {
    // Isolate manual activation from automatic launch; no physical device used.
    navigator.permissions.query = async () => ({ state: "prompt" });
    const get = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    window.testTracks = [];
    navigator.mediaDevices.getUserMedia = async (options) => {
      const stream = await get(options);
      window.testTracks.push(...stream.getTracks());
      return stream;
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__jarvis_voice/status", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ json: { ready: true } });
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.locator("canvas").waitFor();
  await page
    .getByRole("button", { name: "Ativar Jarvis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adormecer Jarvis", exact: true })
    .click();
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(() => window.testTracks.length),
    0,
    "double touch cancels preparation before acquiring microphone",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Ativar Jarvis", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  await page.unroute("**/__jarvis_voice/status");
  await page
    .getByRole("button", { name: "Ativar Jarvis", exact: true })
    .click();
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.audioLevel) > 0.01,
    null,
    { timeout: 60000 },
  );
  assert.equal(
    await page.getByRole("dialog").count(),
    0,
    "touch needs no redundant in-app voice dialog",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.ok(
    await page.evaluate(() =>
      window.testTracks.some((track) => track.readyState === "live"),
    ),
    "authorized background listening remains active",
  );
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.screenshot({ path: "artifacts/hologram-listening.png" });
  await page
    .getByRole("button", { name: "Adormecer Jarvis", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      window.testTracks.length &&
      window.testTracks.every((track) => track.readyState === "ended"),
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Ativar Jarvis", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: direct hologram touch, rapid cancellation, actual worklet RMS animation, no duplicate dialog, all synthetic microphone tracks stopped. Physical microphone not used.",
  );
} finally {
  await browser?.close();
  await server.close();
}
