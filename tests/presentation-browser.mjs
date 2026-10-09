import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";
const server = await createServer({
  cacheDir: "node_modules/.vite/test-presentation",
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
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.getByTestId("hologram").waitFor();
  await page.evaluate(async () => {
    const { JarvisEngine } = await import("/src/core/engine.mjs");
    const { browserStorage } = await import("/src/core/storage.mjs");
    const engine = new JarvisEngine(browserStorage());
    await engine.execute({ type: "task.create", text: "Revisar projeto" });
    await engine.execute({ type: "task.create", text: "Testar voz" });
    await engine.execute({
      type: "screen.card",
      kind: "weather",
      title: "Clima / fixture de teste",
      value: "16",
      unit: "C",
      weatherCode: 61,
      source: "Open-Meteo / fixture, nao consulta real",
    });
    await engine.execute({
      type: "screen.card",
      kind: "news",
      title: "Jornal / fixture",
      value: "Nova interface de assistente em teste",
      unit: "",
      source: "Fixture de teste, nao noticia real",
    });
    await engine.execute({
      type: "screen.card",
      kind: "activity",
      title: "Corrida informada",
      value: "2",
      unit: "km",
      source: "Fixture de teste, nao sensor",
    });
    await engine.execute({
      type: "settings.update",
      changes: { voice: true, autoPin: false },
    });
    await engine.execute({ type: "screen.pin", topic: "weather", value: true });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Mostrar Clima fixado", exact: true })
    .click();
  await page.locator(".topic-glyph canvas").waitFor();
  for (const [width, height, name] of [
    [1440, 900, "desktop"],
    [393, 851, "mobile"],
    [844, 390, "landscape"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(850);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const core = await page.getByTestId("hologram").boundingBox();
    const panel = await page.locator(".presentation-panel").boundingBox();
    assert.ok(
      width <= 700 && height > 550
        ? core.y + core.height <= panel.y + 2
        : core.x + core.width <= panel.x + 2,
      JSON.stringify({ name, core, panel }),
    );
    assert.ok(panel.y + panel.height <= height + 1);
    const image = await page
      .locator(".topic-glyph canvas")
      .evaluate((canvas) => canvas.toDataURL());
    const png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
    let lit = 0;
    for (let index = 0; index < png.data.length; index += 4)
      if (png.data[index] > 70 && png.data[index + 3] > 20) lit++;
    assert.ok(lit > 80, `nonblank thematic canvas: ${name}`);
    await page.waitForTimeout(160);
    assert.notEqual(
      await page
        .locator(".topic-glyph canvas")
        .evaluate((canvas) => canvas.toDataURL()),
      image,
    );
    await page.screenshot({ path: `artifacts/presentation-${name}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "Mostrar Noticias", exact: true })
    .click();
  await page
    .getByText("Nova interface de assistente em teste", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Mostrar Tarefas", exact: true })
    .click();
  await page.getByRole("button", { name: "Fixar topico", exact: true }).click();
  await page
    .getByRole("button", { name: "Desfixar topico", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Mostrar Tarefas fixado", exact: true })
    .waitFor();
  const wav = await fs.readFile("artifacts/voice-original-a.wav");
  await page.route("**/__jarvis_voice/speak", (route) =>
    route.fulfill({ contentType: "audio/wav", body: wav }),
  );
  await page
    .getByRole("button", { name: "Menu do Jarvis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Entrada por texto", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Fale com Jarvis", exact: true })
    .fill("quais tarefas temos");
  await page
    .getByRole("button", { name: "Enviar comando", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voltar a central", exact: true })
    .click();
  await page.locator(".holo-data.narrated").waitFor();
  await page.screenshot({ path: "artifacts/presentation-speaking.png" });
  await page.evaluate(async () => {
    const { JarvisEngine } = await import("/src/core/engine.mjs");
    const { browserStorage } = await import("/src/core/storage.mjs");
    const engine = new JarvisEngine(browserStorage());
    const state = await engine.read();
    for (const card of state.cards)
      await engine.execute({ type: "screen.card.remove", id: card.id });
    for (const topic of state.pins)
      await engine.execute({ type: "screen.pin", topic, value: false });
    for (const panel of state.panels)
      await engine.execute({ type: "screen.close", panel });
    await engine.execute({
      type: "chat.send",
      content: "lembre que prefiro respostas curtas",
    });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Mostrar Memoria", exact: true })
    .click();
  await page.locator('[data-testid="hologram"].presenting-core').waitFor();
  await page.waitForTimeout(850);
  const closedCore = await page.getByTestId("hologram").boundingBox();
  const savedPanel = await page.locator(".presentation-panel").boundingBox();
  assert.ok(closedCore.x + closedCore.width <= savedPanel.x + 2);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real local persistence/pin controls, 3 viewports, thematic pixels/motion, no core-panel overlap and actual audio-play-triggered highlight. Weather/news/playback use explicitly synthetic test fixtures; no account/microphone used.",
  );
} finally {
  await browser?.close();
  await server.close();
}
