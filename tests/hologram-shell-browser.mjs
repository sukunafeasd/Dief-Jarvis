import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const server = await createServer({
  cacheDir: "node_modules/.vite/test-shell",
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
  await page.locator("canvas").waitFor();
  await fs.mkdir("artifacts", { recursive: true });
  const navigate = async (name) => {
    await page
      .getByRole("button", { name: "Menu do Jarvis", exact: true })
      .click();
    await page
      .locator(".navigation")
      .getByRole("button", { name, exact: true })
      .click();
  };
  assert.equal(await page.locator(".command-form").count(), 0);
  assert.equal(
    await page
      .locator(
        ".holo-caption,.holo-mic,.core-heading,.core-identifier,.core-controls",
      )
      .count(),
    0,
  );
  assert.equal(await page.locator(".jarvis-header button").count(), 2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["wide", 1920, 1080],
    ["mobile", 393, 851],
    ["landscape", 844, 390],
    ["small", 320, 640],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(180);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      name,
    );
    const title = await page.locator(".jarvis-header h1").boundingBox();
    const controls = await page.locator(".jarvis-header > div").boundingBox();
    assert.ok(
      title.x + title.width <= controls.x,
      `${name}: centered title does not overlap controls`,
    );
    const png = PNG.sync.read(
      Buffer.from(
        await page
          .locator("canvas")
          .evaluate((canvas) => canvas.toDataURL().split(",")[1]),
        "base64",
      ),
    );
    let colored = 0;
    for (let i = 0; i < png.data.length; i += 4)
      if (png.data[i] > 90 && png.data[i + 1] > 50) colored++;
    assert.ok(colored > 1000, `${name}: core is nonblank`);
    await page.screenshot({
      path: `artifacts/shell-${name}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const first = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(300);
  assert.notEqual(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    first,
    "default continues animating when OS requests reduction",
  );
  const bounds = await page.locator("canvas").boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 30,
    { steps: 5 },
  );
  await page.mouse.up();
  assert.equal(
    await page
      .getByRole("button", { name: "Ativar Jarvis", exact: true })
      .getAttribute("aria-pressed"),
    "false",
    "drag never activates the microphone",
  );
  await navigate("Entrada por texto");
  const command = async (text) => {
    await page.getByRole("textbox", { name: "Fale com Jarvis" }).fill(text);
    await page
      .getByRole("button", { name: "Enviar comando", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".command-form textarea")?.value === "" &&
        document.querySelector(".app-shell")?.getAttribute("aria-busy") ===
          "false",
    );
  };
  await command("crie uma tarefa: Revisar interface");
  await command("Moro em Porto Alegre. Gosto de cafe.");
  await command("tema ciano");
  await navigate("Nucleo e registros");
  await page.getByText("Moro em Porto Alegre", { exact: true }).waitFor();
  assert.equal(await page.locator(".command-form").count(), 0);
  await page.getByRole("tab", { name: "Auditoria", exact: true }).click();
  await page
    .getByRole("button", { name: "Verificar integridade local" })
    .click();
  await page
    .getByText("O registro local esta consistente.", { exact: false })
    .waitFor();
  await page.getByRole("tab", { name: "Execucoes", exact: true }).click();
  await page
    .getByLabel("Nova execucao")
    .fill("crie uma tarefa: Agent browser test; mostre tarefas");
  await page
    .getByRole("button", { name: "Preparar plano", exact: true })
    .click();
  await page.locator(".agent-run.planned").waitFor();
  await page
    .getByRole("button", { name: "Autorizar e executar", exact: true })
    .click();
  await page
    .locator(".modal")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  assert.equal(await page.locator(".agent-run.planned").count(), 1);
  await page
    .getByRole("button", { name: "Autorizar e executar", exact: true })
    .click();
  await page
    .locator(".modal")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await page
    .locator(".agent-run.completed")
    .filter({ hasText: "Agent browser test" })
    .waitFor();
  await navigate("Tarefas");
  await page
    .getByRole("button", { name: "Concluir Revisar interface", exact: true })
    .click();
  await page.getByRole("button", { name: "Concluidas", exact: true }).click();
  await page.getByText("Revisar interface", { exact: true }).waitFor();
  await navigate("Ajustes");
  assert.equal(await page.locator(".command-form").count(), 0);
  await page
    .getByRole("combobox", { name: "Preferencia de movimento" })
    .selectOption("system");
  await navigate("Holograma");
  await page.waitForTimeout(120);
  const still = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    still,
    "optional OS reduction still works",
  );
  await navigate("Ajustes");
  await page
    .getByRole("combobox", { name: "Preferencia de movimento" })
    .selectOption("always");
  await page.getByRole("button", { name: "Voz e audio", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Motor da voz" })
    .selectOption("azure");
  await page
    .getByRole("combobox", { name: "Voz Azure" })
    .selectOption("pt-BR-CaioNeural");
  assert.equal(
    await page.getByRole("textbox", { name: "Chave Azure Speech" }).count(),
    0,
    "browser never stores cloud credentials",
  );
  await page
    .getByRole("combobox", { name: "Motor da voz" })
    .selectOption("neural");
  await page.getByRole("button", { name: "Acesso ao PC", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Politica de acesso" })
    .selectOption("full");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Politica de acesso" })
      .inputValue(),
    "restricted",
  );
  for (const [width, height, name] of [
    [1440, 900, "settings"],
    [393, 851, "settings-mobile"],
    [844, 390, "settings-landscape"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      name,
    );
    await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  }
  await navigate("Holograma");
  await page.reload();
  await page.locator("canvas").waitFor();
  assert.equal(await page.locator(".theme-cyan").count(), 1);
  assert.equal(await page.locator(".command-form").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 5 viewports, animation defaults/options, drag, unified records, real task/plan effects, persistence, Azure UI and no composer leaks.",
  );
} finally {
  await browser?.close();
  await server.close();
}
