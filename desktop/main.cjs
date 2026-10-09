const {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  safeStorage,
  dialog,
  shell,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { WebSession } = require("./web-session.cjs");
const { pathToFileURL } = require("node:url");
const {
  requireSender,
  assetPath,
  requireRendererAction,
  allowAudioCheck,
  allowAudioRequest,
} = require("./policy.cjs");

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
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
let window;
let micGranted = false;
app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});
app
  .whenReady()
  .then(async () => {
    if (!hasLock) return;
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
    const loadDesktop = (name) =>
      import(pathToFileURL(path.join(__dirname, name)).href);
    const { ollamaAssistant } = await import(
      pathToFileURL(path.join(app.getAppPath(), "src/core/ollama.mjs")).href
    );
    const { AssistantSession } = await import(
      pathToFileURL(path.join(app.getAppPath(), "src/core/assistant.mjs")).href
    );
    const { publicUrl } = await loadDesktop("web-policy.mjs");
    const { desktopTool } = await loadDesktop("desktop-service.mjs");
    const { currentWeather } = await loadDesktop("weather.mjs");
    const { techHeadlines } = await loadDesktop("news.mjs");
    const { ComponentInstaller, runtimeRoot } =
      await loadDesktop("components.mjs");
    const { VoiceService } = await loadDesktop("voice-service.mjs");
    const { bootstrapStatus, pullModel, downloadOllama, LOCAL_MODEL } =
      await loadDesktop("bootstrap.mjs");
    const componentsRoot = runtimeRoot();
    const nativeHelper = app.isPackaged
      ? path.join(process.resourcesPath, "native", "DiefJarvis.Desktop.exe")
      : path.join(__dirname, "native", "DiefJarvis.Desktop.exe");
    const sendProgress = (progress) => {
      if (window && !window.isDestroyed())
        window.webContents.send("jarvis:setup-progress", progress);
    };
    const installer = new ComponentInstaller(componentsRoot, {
      progress: sendProgress,
    });
    const voiceService = new VoiceService(componentsRoot);
    let browserAgent,
      setupAbort = null,
      runtimeReady = false;
    const { AgentController } = await import(
      pathToFileURL(path.join(app.getAppPath(), "src/core/agent.mjs")).href
    );
    const { ollamaModels, ollamaPlan } = await import(
      pathToFileURL(path.join(app.getAppPath(), "src/core/ollama.mjs")).href
    );
    const { workspaceTool, checkedPath } = await import(
      pathToFileURL(path.join(__dirname, "workspace.mjs")).href
    );
    const { TOOLS } = await import(
      pathToFileURL(path.join(app.getAppPath(), "src/core/tools.mjs")).href
    );
    const agent = new AgentController(engine, {
      onChange: (state) => {
        if (window && !window.isDestroyed())
          window.webContents.send("jarvis:state", state);
      },
      planner: ollamaPlan,
      approve: async (step) => {
        if (!window || window.isDestroyed()) return false;
        let detail = JSON.stringify(step.args, null, 2);
        if (["web.click", "web.fill"].includes(step.tool))
          detail =
            (await browserAgent.describe(step.args.ref)) + "\n\n" + detail;
        if (
          ["desktop.invoke", "desktop.type", "desktop.focus"].includes(
            step.tool,
          )
        ) {
          const observed = JSON.parse(
            await desktopTool(
              { tool: "desktop.observe", args: { window: step.args.window } },
              nativeHelper,
              AbortSignal.timeout(20000),
            ),
          );
          const control = step.args.ref
            ? observed.controls?.find((item) => item.ref === step.args.ref)
            : null;
          if (step.args.ref && !control)
            throw Error("Controle mudou; observe a janela novamente.");
          detail = JSON.stringify(
            {
              observation: observed.title || observed.name || step.args.window,
              control,
              requested: step.args,
            },
            null,
            2,
          );
        }
        const result = await dialog.showMessageBox(window, {
          type: "warning",
          title: "Autorizar etapa do Jarvis",
          defaultId: 1,
          cancelId: 1,
          buttons: ["Autorizar esta etapa", "Cancelar"],
          message: TOOLS[step.tool].title,
          detail,
        });
        return result.response === 0;
      },
      execute: async (step, state, signal) => {
        signal.throwIfAborted();
        if (step.tool === "web.open")
          return browserAgent.open(step.args.url, signal);
        if (step.tool === "web.observe") return browserAgent.observe();
        if (step.tool === "web.click")
          return browserAgent.act("click", step.args);
        if (step.tool === "web.fill")
          return browserAgent.act("fill", step.args);
        if (step.tool.startsWith("desktop."))
          return desktopTool(step, nativeHelper, signal);
        if (step.tool === "news.headlines") {
          const headlines = await techHeadlines(signal);
          for (const item of headlines) {
            const card = await engine.execute({
              type: "screen.card",
              title: "Hacker News / tecnologia",
              value: item.title,
              unit: "",
              source: `Hacker News / ${item.source}`,
            });
            if (window && !window.isDestroyed())
              window.webContents.send("jarvis:state", card.state);
          }
          return JSON.stringify(headlines);
        }
        if (step.tool === "weather.current") {
          const weather = await currentWeather(step.args.city, signal);
          const card = await engine.execute({
            type: "screen.card",
            title: weather.title,
            value: weather.value,
            unit: weather.unit,
            source: `Open-Meteo / ${weather.measuredAt} / ${weather.source}`,
          });
          if (window && !window.isDestroyed())
            window.webContents.send("jarvis:state", card.state);
          return JSON.stringify(weather);
        }
        if (step.tool === "web.search") {
          await shell.openExternal(
            `https://www.bing.com/search?q=${encodeURIComponent(step.args.query)}`,
          );
          return "Pesquisa aberta no navegador externo. O Jarvis nao leu nem verificou os resultados.";
        }
        return workspaceTool(state.agent.workspace, step, signal, (target) =>
          shell.trashItem(target),
        );
      },
    });
    const assistant = new AssistantSession(engine, agent, {
      decide: ollamaAssistant,
    });
    await agent.recover();
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
        if (
          [
            "/components/stt-pt.tar.gz",
            "/components/stt-wake-en.tar.gz",
          ].includes(new URL(request.url).pathname)
        ) {
          const name = new URL(request.url).pathname.split("/").at(-1);
          if (
            !(await installer.valid(
              installer.files.find((item) => item.file === name),
            ))
          )
            return new Response("Prepare voice components", { status: 409 });
          return new Response(
            await fs.readFile(path.join(componentsRoot, name)),
            { headers: { "Content-Type": "application/gzip" } },
          );
        }
        return new Response(await fs.readFile(file), {
          headers: {
            "content-type":
              mime[path.extname(file)] || "application/octet-stream",
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'",
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
      fullscreen: !test,
      autoHideMenuBar: true,
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
    browserAgent = new WebSession(window, publicUrl);
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (url !== "jarvis://app/") event.preventDefault();
    });
    window.webContents.session.setPermissionRequestHandler(
      (contents, permission, callback, details) =>
        callback(
          allowAudioRequest(contents, window, micGranted, permission, details),
        ),
    );
    window.webContents.session.setPermissionCheckHandler(
      (contents, permission, origin, details) =>
        allowAudioCheck(
          contents,
          window,
          micGranted,
          permission,
          origin,
          details,
        ),
    );
    ipcMain.handle("jarvis:display", (event) => {
      authorize(event);
      window.setFullScreen(!window.isFullScreen());
      return window.isFullScreen();
    });
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
      requireRendererAction(action);
      if (
        !runtimeReady &&
        ![
          "settings.update",
          "permissions.update",
          "screen.view",
          "screen.focus",
        ].includes(action.type)
      )
        throw Error("Conclua a preparacao inicial antes de usar o assistente.");
      if (action?.type === "permissions.update") {
        const current = (await engine.read()).settings.access;
        const next = action.access || {};
        const expands =
          (next.mode === "full" && current.mode !== "full") ||
          ["web", "files", "desktop", "admin"].some(
            (key) => next[key] && !current[key],
          );
        if (expands) {
          const result = await dialog.showMessageBox(window, {
            type: "warning",
            title: "Autorizar Dief Jarvis",
            defaultId: 1,
            cancelId: 1,
            buttons: ["Autorizar", "Cancelar"],
            message: "Confirmar ampliacao da politica de acesso?",
            detail:
              "Web inclui navegador isolado. PC usa controles UI Automation das janelas; campos secretos, terminais e UAC nao podem ser controlados. Arquivos ficam na pasta escolhida. Cliques, preenchimentos, escrita e Lixeira mantem confirmacao. Administrador precisa de uma solicitacao separada ao UAC. Nenhuma protecao do Windows e desativada.",
          });
          if (result.response !== 0)
            throw Error("Autorizacao cancelada. Acesso anterior preservado.");
        }
        action = { ...action, confirmed: true };
      }
      return engine.execute(action);
    });
    ipcMain.handle("jarvis:agent", async (event, request) => {
      authorize(event);
      if (!request || typeof request !== "object")
        throw Error("Pedido invalido.");
      if (request.op === "autonomy") {
        if (assistant.active || agent.active)
          throw Error("Interrompa a tarefa antes de alterar a autonomia.");
        if (request.value === true) {
          const result = await dialog.showMessageBox(window, {
            type: "warning",
            buttons: ["Autorizar autonomia de leitura", "Cancelar"],
            defaultId: 1,
            cancelId: 1,
            message: "Autorizar observacao e replanejamento autonomos?",
            detail:
              "Com acesso total, o Jarvis podera ler paginas e janelas autorizadas, consultar clima e usar comandos locais para cumprir seus pedidos, com ate 8 passos. Paginas/documentos sao dados, nao ordens. Cliques e alteracoes sensiveis ainda pedem confirmacao nativa. Qualquer voz audivel pode acionar a escuta; nao ha verificacao de identidade do falante.",
          });
          if (result.response !== 0) throw Error("Autonomia nao autorizada.");
        }
        return engine.execute({
          type: "agent.autonomy",
          value: request.value,
          confirmed: true,
        });
      }
      if (request.op === "elevate") {
        if (
          process.platform !== "win32" ||
          !(await engine.read()).settings.access.admin
        )
          throw Error("Autorize a solicitacao de administrador primeiro.");
        if (assistant.active || agent.active)
          throw Error("Interrompa a tarefa antes de reiniciar.");
        const choice = await dialog.showMessageBox(window, {
          type: "warning",
          defaultId: 1,
          cancelId: 1,
          buttons: ["Solicitar UAC e reiniciar", "Cancelar"],
          message: "Reiniciar Dief Jarvis com administrador?",
          detail:
            "O Windows exibira o UAC e voce precisa autorizar. Nao controlamos o desktop seguro, nao aceitamos o aviso automaticamente e nao desativamos protecoes. Use somente quando uma tarefa legitimamente exigir elevacao.",
        });
        if (choice.response !== 0) throw Error("Solicitacao cancelada.");
        const quoted = (value) => "'" + value.replace(/'/g, "''") + "'";
        const executable = app.getPath("exe");
        const args = app.isPackaged
          ? ""
          : " -ArgumentList " + quoted('"' + app.getAppPath() + '"');
        const script = `Start-Process -FilePath ${quoted(executable)}${args} -Verb RunAs -PassThru -ErrorAction Stop | Out-Null`;
        app.releaseSingleInstanceLock();
        try {
          await new Promise((resolve, reject) => {
            const child = spawn(
              path.join(
                process.env.SystemRoot || "C:/Windows",
                "System32/WindowsPowerShell/v1.0/powershell.exe",
              ),
              ["-NoProfile", "-NonInteractive", "-Command", script],
              { shell: false, windowsHide: true },
            );
            child.once("error", reject);
            child.once("close", (code) =>
              code === 0
                ? resolve()
                : reject(
                    Error(
                      "O Windows nao autorizou a elevacao. A sessao atual foi preservada.",
                    ),
                  ),
            );
          });
        } catch (error) {
          if (!app.requestSingleInstanceLock()) app.quit();
          throw error;
        }
        app.quit();
        return true;
      }
      if (
        ["plan", "run"].includes(request.op) &&
        (!runtimeReady || assistant.active)
      )
        throw Error("Assistente ocupado ou preparacao inicial incompleta.");
      if (request.op === "plan") return agent.plan(request.goal);
      if (request.op === "run") return agent.run(request.id);
      if (request.op === "cancel") return agent.cancel(request.id);
      if (request.op === "models") return ollamaModels();
      if (request.op === "configure") {
        if (agent.active || assistant.active)
          throw Error("Aguarde a execucao ativa antes de trocar o modelo.");
        if (request.provider === "ollama") {
          const models = await ollamaModels();
          if (!models.includes(request.model))
            throw Error("Modelo nao esta instalado neste Ollama.");
          const answer = await dialog.showMessageBox(window, {
            type: "question",
            defaultId: 1,
            cancelId: 1,
            buttons: ["Usar modelo local", "Cancelar"],
            message: "Autorizar contexto para o Ollama?",
            detail:
              "Pedidos de planejamento enviarao as ultimas 8 mensagens e ate 20 memorias ao servico em 127.0.0.1:11434. Configure o Ollama para usar um modelo local; o Jarvis nao verifica se o servico encaminha dados. Nada sera executado sem autorizar o plano.",
          });
          if (answer.response !== 0) throw Error("Configuracao cancelada.");
        }
        return engine.execute({
          type: "agent.configure",
          provider: request.provider,
          model: request.model,
        });
      }
      if (request.op === "workspace") {
        if (agent.active || assistant.active)
          throw Error("Cancele ou aguarde a execucao antes de trocar a pasta.");
        if (request.revoke === true)
          return engine.execute({ type: "agent.workspace", path: "" });
        const access = (await engine.read()).settings.access;
        if (!access.files)
          throw Error("Autorize arquivos nos ajustes primeiro.");
        const picked = await dialog.showOpenDialog(window, {
          title: "Escolher pasta autorizada do Jarvis",
          properties: ["openDirectory"],
        });
        if (picked.canceled || !picked.filePaths[0])
          throw Error("Selecao de pasta cancelada.");
        const selected = picked.filePaths[0];
        if (path.parse(selected).root === selected)
          throw Error("Escolha uma pasta especifica, nao o disco inteiro.");
        await checkedPath(selected, ".");
        return engine.execute({ type: "agent.workspace", path: selected });
      }
      throw Error("Operacao de agente desconhecida.");
    });
    ipcMain.handle("jarvis:assistant", async (event, request) => {
      authorize(event);
      if (request?.op === "stop") {
        assistant.stop();
        return { state: await engine.read() };
      }
      if (!runtimeReady) throw Error("Conclua a preparacao inicial do Jarvis.");
      const result = await assistant.respond(request?.content);
      if (window && !window.isDestroyed())
        window.webContents.send("jarvis:state", result.state);
      return result;
    });
    ipcMain.handle("jarvis:voice", async (event, request) => {
      authorize(event);
      if (request?.op === "stop") {
        micGranted = false;
        await voiceService.stop();
        return true;
      }
      if (request?.op === "cancel-speech") {
        await voiceService.stop();
        return true;
      }
      if (request?.op === "listen") {
        if (!(await installer.status()).ready)
          throw Error("Prepare os componentes de voz primeiro.");
        const result = await dialog.showMessageBox(window, {
          type: "question",
          defaultId: 1,
          cancelId: 1,
          buttons: ["Ativar microfone nesta sessao", "Cancelar"],
          message: "Autorizar escuta local continua?",
          detail:
            "O microfone sera processado localmente para detectar Jarvis e transcrever pedidos. Audio nao e salvo nem enviado para uma nuvem. Outra pessoa, TV ou gravacao pode acionar o nome; acoes sensiveis mantem confirmacao. Fechar/ocultar a janela ou desativar escuta encerra a captura.",
        });
        micGranted = result.response === 0;
        if (!micGranted) throw Error("Microfone nao autorizado.");
        return true;
      }
      if (request?.op === "speak")
        return Uint8Array.from(
          await voiceService.speak(
            request.text,
            request.profile,
            request.speed,
          ),
        );
      throw Error("Operacao de voz desconhecida.");
    });
    ipcMain.handle("jarvis:setup", async (event, request) => {
      authorize(event);
      const report = async () => {
        const status = await bootstrapStatus(
          installer,
          await engine.read(),
          nativeHelper,
        );
        runtimeReady =
          status.ready && (await engine.read()).agent.provider === "ollama";
        return { ...status, ready: runtimeReady };
      };
      if (request?.op === "status") return report();
      if (request?.op === "exit") {
        app.quit();
        return;
      }
      if (request?.op === "cancel") {
        installer.cancel();
        setupAbort?.abort();
        return true;
      }
      if (setupAbort || installer.active || assistant.active || agent.active)
        throw Error("Preparacao ja em andamento.");
      if (!["voice", "model", "ollama"].includes(request?.op))
        throw Error("Preparacao desconhecida.");
      const abort = new AbortController();
      setupAbort = abort;
      try {
        const consent = await dialog.showMessageBox(window, {
          type: "question",
          defaultId: 1,
          cancelId: 1,
          buttons: ["Preparar componente", "Cancelar"],
          message: "Preparar os componentes do Jarvis?",
          detail:
            request?.op === "voice"
              ? "Baixara cerca de 167 MB de dados de voz/reconhecimento, com versoes fixas e SHA256. Nenhum microfone sera ativado por esta instalacao."
              : request?.op === "model"
                ? "Baixara qwen3:1.7b pelo Ollama (aproximadamente 1,4 GB). Seus pedidos, ultimas mensagens e memorias serao enviados ao servico local quando voce usar o assistente. Sem contratar servicos pagos."
                : "Baixara o instalador oficial Ollama v0.40.1 (1,58 GB), conferira SHA256 e abrira o instalador para voce. Qualquer UAC precisa ser aceito por voce; nenhuma protecao sera desativada.",
        });
        if (consent.response !== 0) throw Error("Preparacao cancelada.");
        if (request.op === "voice") await installer.install();
        else if (request.op === "model") {
          await pullModel(abort.signal, sendProgress);
          await engine.execute({
            type: "agent.configure",
            provider: "ollama",
            model: LOCAL_MODEL,
          });
        } else if (request.op === "ollama") {
          const exe = await downloadOllama(abort.signal, sendProgress);
          const error = await shell.openPath(exe);
          if (error) throw Error(error);
        } else throw Error("Preparacao desconhecida.");
        return report();
      } finally {
        setupAbort = null;
      }
    });
    ipcMain.handle("jarvis:search", async (event, query) => {
      authorize(event);
      if (!runtimeReady) throw Error("Conclua a preparacao inicial do Jarvis.");
      if (typeof query !== "string" || !query.trim() || query.length > 300)
        throw Error("Pesquisa invalida.");
      const access = (await engine.read()).settings.access;
      if (!access.web) throw Error("Autorize pesquisa web nos ajustes.");
      if (access.mode !== "full") {
        const result = await dialog.showMessageBox(window, {
          type: "question",
          buttons: ["Abrir pesquisa", "Cancelar"],
          defaultId: 1,
          cancelId: 1,
          message: "Pesquisar no navegador externo?",
          detail: `O texto sera enviado ao Bing: ${query}`,
        });
        if (result.response !== 0) throw Error("Pesquisa cancelada.");
      }
      // Never accepts URLs, executable paths or shell fragments from the renderer.
      await shell.openExternal(
        `https://www.bing.com/search?q=${encodeURIComponent(query.trim())}`,
      );
      return engine.execute({ type: "tool.web.search", query: query.trim() });
    });
    ipcMain.handle("jarvis:platform", (event) => {
      authorize(event);
      return {
        name: "Windows · app local",
        storage: safeStorage.isEncryptionAvailable()
          ? "SQLite · protecao do Windows"
          : "Protecao do sistema indisponivel",
        capabilities: {
          web: true,
          files: true,
          desktop: process.platform === "win32",
          admin: process.platform === "win32",
          voice: true,
        },
      };
    });
    window.on("closed", () => {
      micGranted = false;
      assistant.stop();
      browserAgent.close();
      voiceService.stop();
      installer.cancel();
      setupAbort?.abort();
      window = null;
    });
    const suspendVoice = () => {
      micGranted = false;
      voiceService.stop();
    };
    window.on("minimize", suspendVoice);
    window.on("hide", suspendVoice);
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
