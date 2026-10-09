import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs/promises";
const live = await createServer({
  cacheDir: "node_modules/.vite/test-startup-live",
  server: { host: "127.0.0.1", port: 0 },
});
const isolated = await createServer({
  cacheDir: "node_modules/.vite/test-startup-isolated",
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await live.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Users/cafe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
        : undefined),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const url = `http://127.0.0.1:${live.httpServer.address().port}`,
    page = await browser.newPage();
  await page.goto(url);
  await page.getByRole("region", { name: "Jarvis por voz" }).waitFor();
  await isolated.listen();
  assert.notEqual(live.config.cacheDir, isolated.config.cacheDir);
  const other = await browser.newPage();
  await other.goto(`http://127.0.0.1:${isolated.httpServer.address().port}`);
  await other.getByRole("region", { name: "Jarvis por voz" }).waitFor();
  await isolated.close();
  await page.reload();
  await page.getByRole("region", { name: "Jarvis por voz" }).waitFor();
  assert.equal((await fetch(url + "/src/main.jsx")).status, 200);
  const failed = await browser.newPage();
  const moduleUrl = /\/src\/main\.jsx(?:\?|$)/;
  await failed.route(moduleUrl, (route) => route.abort());
  await failed.goto(url);
  await failed
    .getByRole("button", { name: "Recarregar", exact: true })
    .waitFor();
  assert.ok(
    (await failed.locator("#boot-status").innerText()).includes("preservados"),
  );
  await fs.mkdir("artifacts", { recursive: true });
  await failed.screenshot({ path: "artifacts/startup-recovery.png" });
  await failed.unroute(moduleUrl);
  await failed.getByRole("button", { name: "Recarregar", exact: true }).click();
  await failed.getByRole("region", { name: "Jarvis por voz" }).waitFor();
  console.log(
    "PASS: isolated optimizer caches keep live preview usable; blocked startup gives recovery UI and reload restores the hologram.",
  );
} finally {
  await browser?.close();
  await isolated.close();
  await live.close();
}
