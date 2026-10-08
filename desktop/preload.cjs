const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "jarvisDesktop",
  Object.freeze({
    read: () => ipcRenderer.invoke("jarvis:read"),
    execute: (action) => ipcRenderer.invoke("jarvis:execute", action),
    platform: () => ipcRenderer.invoke("jarvis:platform"),
  }),
);
