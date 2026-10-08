const {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  safeStorage,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const { requireSender, assetPath } = require("./policy.cjs");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "jarvis",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);
const test = process.argv.includes("--interface-test");
if (test && process.env.JARVIS_TEST_DATA)
  app.setPath("userData", process.env.JARVIS_TEST_DATA);
if (!app.requestSingleInstanceLock()) app.quit();
let window;
app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});
app
  .whenReady()
  .then(async () => {
    const { DatabaseSync } = require("node:sqlite");
    const root = path.join(app.getAppPath(), "dist");
    const dataRoot = app.getPath("userData");
    await fs.mkdir(dataRoot, { recursive: true });
    const database = new DatabaseSync(path.join(dataRoot, "workspace.sqlite"));
    database.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload BLOB NOT NULL)",
    );
    const storage = {
      async read() {
        const record = database
          .prepare("SELECT revision,payload FROM workspace WHERE id=1")
          .get();
        if (!record) return null;
        if (!safeStorage.isEncryptionAvailable())
          throw Error("A protecao local do sistema nao esta disponivel.");
        const state = JSON.parse(
          safeStorage.decryptString(Buffer.from(record.payload)),
        );
        if (state.revision !== record.revision)
          throw Error("Revisao do banco inconsistente.");
        return state;
      },
      async save(revision, state) {
        if (!safeStorage.isEncryptionAvailable())
          throw Error(
            "Nao foi possivel proteger os dados locais. Nada foi salvo em texto aberto.",
          );
        const json = JSON.stringify(state);
        if (Buffer.byteLength(json) > 8 * 1024 * 1024)
          throw Error("Limite de armazenamento local atingido.");
        const payload = safeStorage.encryptString(json);
        database.exec("BEGIN IMMEDIATE");
        try {
          const current = database
            .prepare("SELECT revision FROM workspace WHERE id=1")
            .get();
          if ((current?.revision || 0) !== revision)
            throw Error("Dados mudaram em outra instancia.");
          database
            .prepare(
              "INSERT INTO workspace (id,revision,payload) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload",
            )
            .run(state.revision, payload);
          database.exec("COMMIT");
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      },
    };
    const { JarvisEngine } = await import(
      pathToFileURL(path.join(app.getAppPath(), "src/core/engine.mjs")).href
    );
    const engine = new JarvisEngine(storage);
    const mime = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
    };
    protocol.handle("jarvis", async (request) => {
      try {
        const file = assetPath(root, request.url);
        return new Response(await fs.readFile(file), {
          headers: {
            "content-type":
              mime[path.extname(file)] || "application/octet-stream",
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    });
    window = new BrowserWindow({
      width: 1480,
      height: 940,
      minWidth: 980,
      minHeight: 650,
      title: "Dief Jarvis",
      backgroundColor: "#080b0e",
      icon: path.join(root, "jarvis-mark.png"),
      show: !test,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (url !== "jarvis://app/") event.preventDefault();
    });
    window.webContents.session.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    window.webContents.session.setPermissionCheckHandler(() => false);
    let ticks = [];
    function authorize(event) {
      requireSender(event, window);
      const now = Date.now();
      ticks = ticks.filter((time) => now - time < 30000);
      if (ticks.length >= 100)
        throw Error("Muitos comandos. Aguarde alguns instantes.");
      ticks.push(now);
    }
    ipcMain.handle("jarvis:read", async (event) => {
      authorize(event);
      return engine.read();
    });
    ipcMain.handle("jarvis:execute", async (event, action) => {
      authorize(event);
      return engine.execute(action);
    });
    ipcMain.handle("jarvis:platform", (event) => {
      authorize(event);
      return {
        name: "Windows · app local",
        storage: safeStorage.isEncryptionAvailable()
          ? "SQLite · protecao do Windows"
          : "Protecao do sistema indisponivel",
      };
    });
    window.on("closed", () => {
      window = null;
    });
    await window.loadURL("jarvis://app/");
    if (test) {
      try {
        const result = await engine.execute({
          type: "chat.send",
          content: "mostre minhas tarefas",
        });
        if (!result.state.panels.includes("tasks"))
          throw Error("Comando de tela nao funcionou.");
        const task = await engine.execute({
          type: "task.create",
          text: "Teste desktop sintetico",
        });
        if (
          !task.state.tasks.some(
            (item) => item.text === "Teste desktop sintetico",
          )
        )
          throw Error("Tarefa nao salva.");
        const loaded = await storage.read();
        if (loaded.revision !== task.state.revision)
          throw Error("Persistencia divergente.");
        const context = await window.webContents.executeJavaScript(
          "({node:typeof window.require,bridge:typeof window.jarvisDesktop?.execute})",
        );
        if (context.node !== "undefined" || context.bridge !== "function")
          throw Error("Isolamento do renderer invalido.");
        await fs.writeFile(
          path.join(dataRoot, "test-result.json"),
          JSON.stringify(
            {
              ok: true,
              encrypted: safeStorage.isEncryptionAvailable(),
              revision: loaded.revision,
              context,
            },
            null,
            2,
          ),
        );
        app.exit(0);
      } catch (error) {
        await fs.writeFile(
          path.join(dataRoot, "test-result.json"),
          JSON.stringify({ ok: false, error: error.message }),
        );
        app.exit(1);
      }
    }
    app.once("will-quit", () => database.close());
  })
  .catch((error) => {
    console.error("Jarvis startup failed:", error.message);
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
