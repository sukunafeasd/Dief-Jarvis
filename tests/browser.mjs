import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

await mkdir("artifacts", { recursive: true });
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Users/cafe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
        : undefined),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator("canvas").waitFor();
  assert.equal(await page.locator(".command-form").count(), 0, "voice hologram has no composer");
  await page.getByRole("button", { name: "Menu do Jarvis", exact: true }).click();
  await page.getByRole("button", { name: "Modo painel", exact: true }).click();
  await page.waitForTimeout(450);
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
      `${name}: horizontal overflow`,
    );
    const form = await page.locator(".command-form").boundingBox();
    assert.ok(
      form.width > 250 && form.x >= 0 && form.x + form.width <= width + 1,
    );
    const buffer = await page.locator("canvas").screenshot();
    const png = PNG.sync.read(buffer);
    let colored = 0;
    for (let i = 0; i < png.data.length; i += 4)
      if (png.data[i] > 100 && png.data[i + 1] > 55) colored++;
    assert.ok(
      colored > 1000,
      `${name}: hologram must render visible pixels (${colored})`,
    );
    await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
    if (name === "mobile") {
      assert.equal(
        await page.locator(".navigation").evaluate((el) => el.inert),
        true,
      );
      await page.getByRole("button", { name: "Abrir navegacao" }).click();
      assert.equal(
        await page.locator(".main-shell").evaluate((el) => el.inert),
        true,
      );
      await page
        .locator(".navigation")
        .getByRole("button", { name: "Fechar navegacao" })
        .click();
      assert.equal(
        await page.locator(".main-shell").evaluate((el) => el.inert),
        false,
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const first = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(300);
  assert.notEqual(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    first,
    "core moves",
  );
  const canvasBounds = await page.locator("canvas").boundingBox();
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.5,
    canvasBounds.y + canvasBounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.55,
    canvasBounds.y + canvasBounds.height * 0.55,
  );
  await page.mouse.up();
  async function command(text) {
    await page.getByRole("textbox", { name: "Fale com Jarvis" }).fill(text);
    await page
      .getByRole("button", { name: "Enviar comando", exact: true })
      .click();
    await page.waitForFunction(() => document.querySelector(".app-shell")?.getAttribute("aria-busy") === "false" && document.querySelector(".command-form textarea")?.value === "");
    await page.waitForTimeout(100);
  }
  await command("crie uma tarefa: Revisar interface");
  assert.equal(
    await page.locator(".phase-responding").count(),
    1,
    "completed commands show their response state",
  );
  assert.equal(
    await page.locator("canvas").getAttribute("data-phase"),
    "responding",
  );
  await page
    .locator('[data-panel="tasks"]')
    .getByText("Revisar interface", { exact: true })
    .waitFor();
  await command("lembre que gosto do nucleo ambar");
  await page
    .locator('[data-panel="memory"]')
    .getByText("gosto do nucleo ambar", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator('[data-panel="tasks"]')
    .getByText("Revisar interface", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Mover Memoria para cima" }).click();
  await page.waitForFunction(() => document.querySelector(".tool-window")?.getAttribute("data-panel") === "memory");
  assert.equal(
    await page.locator(".tool-window").first().getAttribute("data-panel"),
    "memory",
  );
  await page
    .getByRole("button", { name: "Fechar Memoria", exact: true })
    .click();
  await page.locator('[data-panel="memory"]').waitFor({ state: "detached" });
  assert.equal(await page.locator('[data-panel="memory"]').count(), 0);
  await command("mostre auditoria");
  await page.locator('[data-panel="audit"]').waitFor();
  await command("modo foco");
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".app-shell.focus-mode").count(), 1);
  await page
    .getByRole("button", { name: "Sair do modo foco", exact: true })
    .click();
  await page.locator(".app-shell.focus-mode").waitFor({ state: "detached" });
  await command("tema ciano");
  await page.waitForTimeout(150);
  assert.equal(await page.locator(".theme-cyan").count(), 1);
  await page.screenshot({ path: "artifacts/cyan.png", fullPage: true });
  await page.getByRole("button", { name: "Conversa", exact: true }).click();
  await page.getByRole("heading", { name: "Conversa", exact: true }).waitFor();
  assert.equal(await page.locator(".message.user").count(), 5);
  await page.getByRole("button", { name: "Tarefas", exact: true }).click();
  await page
    .getByRole("button", { name: "Concluir Revisar interface" })
    .click();
  await page.getByRole("button", { name: "Concluir Revisar interface" }).waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Concluidas", exact: true }).click();
  await page.getByText("Revisar interface", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Excluir Revisar interface" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(
    await page.getByText("Revisar interface", { exact: true }).count(),
    1,
  );
  await page.getByRole("button", { name: "Auditoria", exact: true }).click();
  await page.getByRole("heading", { name: "Auditoria", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Verificar integridade local" })
    .click();
  await page
    .getByText("O registro local esta consistente.", { exact: false })
    .waitFor();
  await page.screenshot({ path: "artifacts/audit.png", fullPage: true });
  await page.getByRole("button", { name: "Central", exact: true }).click();
  await page
    .getByRole("button", { name: "Pausar nucleo", exact: true })
    .click();
  await page.waitForTimeout(200);
  const still = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    still,
    "paused core remains still",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Animar nucleo", exact: true })
    .click();
  await page.waitForTimeout(200);
  const reduced = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    reduced,
    "reduced motion honored",
  );
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Preferencia de movimento" })
    .selectOption("always");
  await page.waitForTimeout(200);
  const override = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(350);
  assert.notEqual(
    await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    override,
    "explicit movement preference resumes core",
  );
  await page.getByRole("button", { name: "Voz e audio", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Idioma da voz" })
    .selectOption("en-GB");
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
  await page
    .getByRole("combobox", { name: "Politica de acesso" })
    .selectOption("full");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.waitForTimeout(100);
  assert.equal(
    await page
      .getByRole("combobox", { name: "Politica de acesso" })
      .inputValue(),
    "full",
  );
  await page
    .getByRole("button", { name: "Revogar todos os acessos", exact: true })
    .click();
  await page.waitForTimeout(100);
  assert.equal(
    await page
      .getByRole("combobox", { name: "Politica de acesso" })
      .inputValue(),
    "restricted",
  );
  for (const [width, height, name] of [
    [1440, 900, "settings"],
    [393, 851, "settings-mobile"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  }
  await page.reload();
  await page.getByRole("button", { name: "Voz e audio", exact: true }).click();
  assert.equal(
    await page.getByRole("combobox", { name: "Idioma da voz" }).inputValue(),
    "en-GB",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Execucoes", exact: true }).click();
  await page
    .getByLabel("Nova execucao")
    .fill("crie uma tarefa: Agent browser test; mostre tarefas");
  await page
    .getByRole("button", { name: "Preparar plano", exact: true })
    .click();
  await page.locator(".agent-run.planned").waitFor();
  assert.equal(await page.locator(".agent-run.planned li.pending").count(), 2);
  await page
    .getByRole("button", { name: "Autorizar e executar", exact: true })
    .click();
  await page
    .locator(".modal")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  assert.equal(
    await page.locator(".agent-run.planned").count(),
    1,
    "dismissed authorization does not run",
  );
  await page
    .getByRole("button", { name: "Autorizar e executar", exact: true })
    .click();
  await page
    .locator(".modal")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  const completedRun = page.locator(".agent-run.completed").filter({ hasText: "Agent browser test" });
  await completedRun.waitFor();
  assert.equal(
    await completedRun.locator("li.completed").count(),
    2,
  );
  for (const [width, height, name] of [
    [1440, 900, "agent"],
    [393, 851, "agent-mobile"],
    [844, 390, "agent-landscape"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `${name}: no overflow`,
    );
    await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  }
  await page.reload();
  await completedRun.waitFor();
  assert.equal(
    await completedRun.locator("li.completed").count(),
    2,
    "run history persisted",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Nova execucao").fill("pesquise teste");
  await page
    .getByRole("button", { name: "Preparar plano", exact: true })
    .click();
  await page.locator(".agent-run.failed").waitFor();
  assert.match(
    await page.locator(".agent-run.failed").innerText(),
    /requer o EXE/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: four viewports, canvas pixels/motion/drag, commands, persistence, ordering, focus, theme, tasks, audit, pause and reduced motion.",
  );
} finally {
  await browser?.close();
  await server.close();
}
