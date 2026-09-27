const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  openMarkdown: () => ipcRenderer.invoke("fs:openMarkdown"),
  saveMarkdown: (payload) => ipcRenderer.invoke("fs:saveMarkdown", payload),
  pickAsset: (payload) => ipcRenderer.invoke("fs:pickAsset", payload),
  mediaUrl: (documentPath, href) =>
    ipcRenderer.sendSync("fs:mediaUrl", { documentPath, href }),
});
