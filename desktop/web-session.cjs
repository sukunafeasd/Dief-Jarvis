const WORLD = 777;
function observeDOM() {
  const refs = new Map(),
    controls = [];
  for (const node of document.querySelectorAll(
    "a[href],button,input:not([type=hidden]),textarea,select,[role=button]",
  )) {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    if (
      !rect.width ||
      !rect.height ||
      style.visibility === "hidden" ||
      style.display === "none" ||
      node.disabled ||
      node.type === "password" ||
      node.type === "file" ||
      /cc-|current-password|new-password/.test(node.autocomplete || "")
    )
      continue;
    const ref = crypto.randomUUID();
    refs.set(ref, node);
    controls.push({
      ref,
      kind: node.tagName.toLowerCase(),
      name: (
        node.getAttribute("aria-label") ||
        node.innerText ||
        node.placeholder ||
        node.name ||
        ""
      ).slice(0, 100),
    });
    if (controls.length === 40) break;
  }
  globalThis.diefRefs = { refs, at: Date.now() };
  return {
    url: location.href,
    title: document.title.slice(0, 200),
    text: document.body?.innerText.slice(0, 7500) || "",
    controls,
  };
}
function actDOM(ref, value, operation) {
  if (!["describe", "click", "fill"].includes(operation))
    throw Error("Acao de pagina desconhecida.");
  const store = globalThis.diefRefs;
  if (!store || Date.now() - store.at > 30000)
    throw Error("Referencias expiraram. Observe a pagina novamente.");
  const node = store.refs.get(ref);
  if (!node?.isConnected || node.disabled)
    throw Error("Elemento mudou ou esta indisponivel.");
  if (
    node.type === "password" ||
    node.type === "file" ||
    /cc-|password/.test(node.autocomplete || "")
  )
    throw Error("Campo sensivel ou upload exige operacao manual.");
  if (operation === "describe")
    return JSON.stringify({
      url: location.href,
      title: document.title.slice(0, 200),
      control: (
        node.getAttribute("aria-label") ||
        node.innerText ||
        node.placeholder ||
        node.name ||
        ""
      ).slice(0, 200),
    });
  node.scrollIntoView({ block: "center", inline: "nearest" });
  const rect = node.getBoundingClientRect(),
    style = getComputedStyle(node);
  if (
    !rect.width ||
    !rect.height ||
    style.visibility === "hidden" ||
    style.display === "none" ||
    node.readOnly
  )
    throw Error("Controle nao esta visivel/editavel.");
  if (operation === "click") {
    node.click();
    return "Clique enviado; observe a pagina para conferir o efeito.";
  }
  if (!/^(INPUT|TEXTAREA)$/.test(node.tagName))
    throw Error("Elemento nao e um campo de texto suportado.");
  const setter = Object.getOwnPropertyDescriptor(
    node.tagName === "INPUT"
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (!setter) throw Error("Campo nao editavel.");
  setter.call(node, value);
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
  return "Texto preenchido; nenhum formulario foi enviado automaticamente.";
}
class WebSession {
  constructor(parent, validateUrl) {
    this.parent = parent;
    this.validateUrl = validateUrl;
    this.window = null;
  }
  async open(url, signal) {
    const { BrowserWindow, session } = require("electron");
    const safe = await this.validateUrl(url);
    signal.throwIfAborted();
    if (!this.window || this.window.isDestroyed()) {
      const isolated = session.fromPartition(
        "dief-agent-" + require("node:crypto").randomUUID(),
      );
      isolated.setPermissionRequestHandler((_web, _permission, callback) =>
        callback(false),
      );
      isolated.setPermissionCheckHandler(() => false);
      isolated.on("will-download", (event) => event.preventDefault());
      isolated.webRequest.onBeforeRequest((details, callback) => {
        if (details.url === "about:blank" || /^(data|blob):/.test(details.url))
          return callback({});
        this.validateUrl(details.url).then(
          () => callback({}),
          () => callback({ cancel: true }),
        );
      });
      this.window = new BrowserWindow({
        width: 1200,
        height: 850,
        title: "Navegador Dief Jarvis",
        parent: this.parent,
        webPreferences: {
          session: isolated,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });
      this.window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      this.window.webContents.on("will-navigate", (event, target) => {
        if (!target.startsWith("https://")) event.preventDefault();
      });
    }
    const win = this.window;
    const stop = () => {
      if (!win.isDestroyed()) win.webContents.stop();
    };
    signal.addEventListener("abort", stop, { once: true });
    let timeout;
    try {
      await Promise.race([
        win.loadURL(safe),
        new Promise((_resolve, reject) => {
          timeout = setTimeout(() => {
            stop();
            reject(Error("Pagina nao carregou dentro de 30 segundos."));
          }, 30000);
        }),
      ]);
      signal.throwIfAborted();
      return await this.observe();
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", stop);
    }
  }
  async observe() {
    if (!this.window || this.window.isDestroyed())
      throw Error("Abra uma pagina no navegador agente primeiro.");
    await this.validateUrl(this.window.webContents.getURL());
    const data = await this.window.webContents.executeJavaScriptInIsolatedWorld(
      WORLD,
      [{ code: `(${observeDOM.toString()})()` }],
    );
    return JSON.stringify(data);
  }
  async act(operation, args) {
    if (!this.window || this.window.isDestroyed())
      throw Error("Navegador agente nao esta aberto.");
    await this.validateUrl(this.window.webContents.getURL());
    return this.window.webContents.executeJavaScriptInIsolatedWorld(WORLD, [
      {
        code: `(${actDOM.toString()})(${JSON.stringify(args.ref)},${JSON.stringify(args.text || "")},${JSON.stringify(operation)})`,
      },
    ]);
  }
  describe(ref) {
    return this.act("describe", { ref });
  }
  close() {
    if (this.window && !this.window.isDestroyed()) this.window.close();
    this.window = null;
  }
}
module.exports = { WebSession, observeDOM, actDOM };
