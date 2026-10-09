const path = require("node:path");
function requireSender(event, window) {
  if (
    !window ||
    window.isDestroyed() ||
    event?.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    !event.senderFrame
  )
    throw Error("Origem nao autorizada.");
  const url = new URL(event.senderFrame.url);
  if (
    url.protocol !== "jarvis:" ||
    url.hostname !== "app" ||
    url.port ||
    url.username ||
    url.password
  )
    throw Error("Origem nao autorizada.");
}
function assetPath(root, url) {
  const target = new URL(url);
  if (
    target.protocol !== "jarvis:" ||
    target.hostname !== "app" ||
    target.username ||
    target.password ||
    target.port
  )
    throw Error("Recurso nao autorizado.");
  const name = decodeURIComponent(target.pathname);
  if (name.includes("\\") || name.includes("\0"))
    throw Error("Caminho invalido.");
  const resolved = path.resolve(
    root,
    `.${name === "/" ? "/index.html" : name}`,
  );
  const relative = path.relative(path.resolve(root), resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw Error("Caminho fora do aplicativo.");
  return resolved;
}
function requireRendererAction(action) {
  if (
    !action ||
    typeof action.type !== "string" ||
    action.type === "tool.web.search" ||
    action.type.startsWith("agent.")
  )
    throw Error(
      "Use o executor autorizado; transicoes internas nao podem vir do renderer.",
    );
}
module.exports = { requireSender, assetPath, requireRendererAction };
