const { dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Abrir / guardar archivos Markdown (.md).
 */
async function openMarkdown(browserWindow) {
  const result = await dialog.showOpenDialog(browserWindow, {
    title: "Abrir Markdown",
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  return { filePath, content };
}

async function saveMarkdown(browserWindow, { filePath, content }) {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(browserWindow, {
      title: "Guardar Markdown",
      defaultPath: "documento.md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    targetPath = result.filePath.endsWith(".md")
      ? result.filePath
      : `${result.filePath}.md`;
  }

  await fs.writeFile(targetPath, content ?? "", "utf8");

  // Asegura carpeta assets/ junto al .md
  const assetsDir = path.join(path.dirname(targetPath), "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  return { filePath: targetPath };
}

module.exports = { openMarkdown, saveMarkdown };
