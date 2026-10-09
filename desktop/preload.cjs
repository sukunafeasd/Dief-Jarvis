const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "jarvisDesktop",
  Object.freeze({
    read: () => ipcRenderer.invoke("jarvis:read"),
    execute: (action) => ipcRenderer.invoke("jarvis:execute", action),
    platform: () => ipcRenderer.invoke("jarvis:platform"),
    search: (query) => ipcRenderer.invoke("jarvis:search", query),
    agent: (request) => ipcRenderer.invoke("jarvis:agent", request),
    onState: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on("jarvis:state", handler);
      return () => ipcRenderer.removeListener("jarvis:state", handler);
    },
  }),
);
