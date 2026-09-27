const { app, BrowserWindow, ipcMain, protocol, net } = require("electron");
const path = require("node:path");
const { openMarkdown, saveMarkdown } = require("./fileSystem/markdown");
const { pickAndCopyAsset } = require("./fileSystem/assets");
const {
  resolveMediaUrl,
  absolutePathFromMediaUrl,
  pathToFileURL,
} = require("./fileSystem/media");

const isDev = process.env.ELECTRON_DEV === "1";
let mainWindow = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "mdmedia",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 720,
    minHeight: 480,
    title: "Editor Markdown",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  protocol.handle("mdmedia", (request) => {
    const filePath = absolutePathFromMediaUrl(request.url);
    if (!filePath) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).href);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("fs:openMarkdown", () => openMarkdown(mainWindow));
ipcMain.handle("fs:saveMarkdown", (_event, payload) =>
  saveMarkdown(mainWindow, payload)
);
ipcMain.handle("fs:pickAsset", (_event, payload) =>
  pickAndCopyAsset(mainWindow, payload)
);

ipcMain.on("fs:mediaUrl", (event, { documentPath, href }) => {
  event.returnValue = resolveMediaUrl(documentPath, href);
});
