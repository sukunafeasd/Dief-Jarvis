const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "jarvisDesktop",
  Object.freeze({
    read: () => ipcRenderer.invoke("jarvis:read"),
    execute: (action) => ipcRenderer.invoke("jarvis:execute", action),
    platform: () => ipcRenderer.invoke("jarvis:platform"),
    search: (query) => ipcRenderer.invoke("jarvis:search", query),
    agent: (request) => ipcRenderer.invoke("jarvis:agent", request),
    assistant: (request) => ipcRenderer.invoke("jarvis:assistant", request),
    voice: (request) => ipcRenderer.invoke("jarvis:voice", request),
    setup: (request) => ipcRenderer.invoke("jarvis:setup", request),
    display: () => ipcRenderer.invoke("jarvis:display"),
    onSetupProgress: (callback) => {
      const handler = (_event, progress) => callback(progress);
      ipcRenderer.on("jarvis:setup-progress", handler);
      return () => ipcRenderer.removeListener("jarvis:setup-progress", handler);
    },
    onState: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on("jarvis:state", handler);
      return () => ipcRenderer.removeListener("jarvis:state", handler);
    },
  }),
);
