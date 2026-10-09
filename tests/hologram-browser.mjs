import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { initialState } from "../src/core/model.mjs";
import { createRequire } from "node:module";
const { observeDOM, actDOM } = createRequire(import.meta.url)(
  "../desktop/web-session.cjs",
);
await fs.mkdir("artifacts", { recursive: true });
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
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
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator("canvas").waitFor();
  assert.equal(await page.locator(".command-form").count(), 0);
  assert.equal(
    await page.evaluate(() => document.querySelector(".navigation").inert),
    true,
  );
  await page.getByRole("button", { name: "Abrir conversa por texto" }).click();
  for (const text of [
    "crie uma tarefa: revisar os executores",
    "hoje eu corri dois quilometros",
  ]) {
    await page.getByRole("textbox", { name: "Fale com Jarvis" }).fill(text);
    await page
      .getByRole("button", { name: "Enviar comando", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".app-shell")?.getAttribute("aria-busy") ===
          "false" &&
        document.querySelector(".command-form textarea")?.value === "",
    );
  }
  await page
    .getByRole("button", { name: "Voltar a central", exact: true })
    .click();
  await page.getByRole("region", { name: "Jarvis por voz" }).waitFor();
  assert.equal(await page.locator(".command-form").count(), 0);
  assert.ok(
    (await page.locator(".holo-cards").innerText()).includes(
      "revisar os executores",
    ),
  );
  assert.ok((await page.locator(".holo-data-value").innerText()).includes("2"));
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["wide", 1920, 1080],
    ["mobile", 393, 851],
    ["landscape", 844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      name,
    );
    const heading = await page.locator(".core-heading h1").boundingBox();
    assert.ok(
      heading.x >= 0 && heading.x + heading.width <= width + 1,
      `${name}: brand heading stays inside viewport`,
    );
    assert.equal(
      await page.locator(".core-identifier").isVisible(),
      false,
      "no stale identifier overlays the caption",
    );
    const cards = await page.locator(".holo-cards").boundingBox(),
      controls = await page.locator(".holo-bottom").boundingBox();
    assert.ok(
      cards.x >= 0 &&
        cards.x + cards.width <= width + 1 &&
        cards.y >= 0 &&
        cards.y + cards.height <= controls.y + 1,
      `${name}: cards must fit without covering voice controls`,
    );
    const canvas = page.locator("canvas"), firstBounds = await canvas.boundingBox();
    await page.waitForTimeout(200);
    const settledBounds = await canvas.boundingBox();
    for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(firstBounds[key] - settledBounds[key]) < 1, `${name}: canvas ${key} remains stable`);
    const png = PNG.sync.read(Buffer.from(await canvas.evaluate((el) => el.toDataURL().split(",")[1]), "base64"));
    let colored = 0;
    for (let i = 0; i < png.data.length; i += 4)
      if (png.data[i] > 90 && png.data[i + 1] > 50) colored++;
    assert.ok(colored > 1000, `${name}: hologram is not blank`);
    await page.screenshot({
      path: `artifacts/hologram-${name}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const before = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(350);
  assert.notEqual(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    before,
    "hologram animates",
  );
  await page.getByRole("button", { name: "Tela cheia", exact: true }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.evaluate(() => document.exitFullscreen());
  await page
    .getByRole("button", { name: "Fechar tarefas", exact: true })
    .click();
  await page.locator(".holo-task-data").waitFor({ state: "detached" });
  await page.reload();
  await page.locator(".holo-data-value").waitFor();
  assert.equal(await page.locator(".command-form").count(), 0);
  assert.deepEqual(errors, []);
  // Renderer-only startup fixture: checks blocking UI, not Windows IPC or installation.
  const startup = await browser.newPage();
  await startup.addInitScript((state) => {
    window.jarvisDesktop = {
      read: async () => state,
      onState: () => () => {},
      onSetupProgress: () => () => {},
      platform: async () => ({ name: "Windows / fixture", capabilities: {} }),
      setup: async () => ({
        ready: false,
        components: { ready: false },
        brain: { running: false, models: [], selected: "" },
        desktop: { ready: true },
      }),
      voice: async () => true,
    };
  }, initialState());
  await startup.goto(url);
  await startup
    .getByRole("dialog", { name: "Preparacao inicial do Jarvis" })
    .waitFor();
  await startup.keyboard.press("Escape");
  assert.ok(await startup.getByRole("dialog").isVisible());
  assert.ok(
    await startup
      .getByRole("button", { name: "Preparar", exact: true })
      .last()
      .isDisabled(),
    "model download requires running runtime",
  );
  await startup.screenshot({ path: "artifacts/startup-fixture.png" });
  const fixturePage = await browser.newPage();
  await fixturePage.goto(url);
  await fixturePage.setContent(
    '<title>Fixture de controles</title><button id="go" onclick="document.body.dataset.clicked=1">Continuar</button><input aria-label="Nome" id="name"><input type="password" id="secret"><input type="file" id="upload"><button style="visibility:hidden">Oculto</button>',
  );
  const observation = await fixturePage.evaluate(observeDOM);
  assert.deepEqual(observation.controls.map((item) => item.name).sort(), [
    "Continuar",
    "Nome",
  ]);
  const fillRef = observation.controls.find((item) => item.name === "Nome").ref;
  const clickRef = observation.controls.find(
    (item) => item.name === "Continuar",
  ).ref;
  await fixturePage.evaluate(
    `(${actDOM.toString()})(${JSON.stringify(fillRef)},"Cafe","fill")`,
  );
  assert.equal(await fixturePage.locator("#name").inputValue(), "Cafe");
  await fixturePage.evaluate(
    `(${actDOM.toString()})(${JSON.stringify(clickRef)},"","click")`,
  );
  assert.equal(
    await fixturePage.locator("body").getAttribute("data-clicked"),
    "1",
  );
  await fixturePage.evaluate(() => {
    globalThis.diefRefs.at -= 31000;
  });
  await assert.rejects(
    fixturePage.evaluate(
      `(${actDOM.toString()})(${JSON.stringify(clickRef)},"","click")`,
    ),
    /expiraram/,
  );
  await fixturePage.evaluate(() => {
    globalThis.diefRefs.at = Date.now();
    globalThis.diefRefs.refs.set("secret", document.querySelector("#secret"));
  });
  await assert.rejects(
    fixturePage.evaluate(
      `(${actDOM.toString()})("secret","do not fill","fill")`,
    ),
    /sensivel/,
  );
  console.log(
    "PASS: voice-only hologram, actual saved task/metric cards, four viewports, canvas motion/pixels, fullscreen and mandatory startup UI fixture.",
  );
} finally {
  await browser?.close();
  await server.close();
}
