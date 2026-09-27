const { dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
]);

/**
 * Copia una imagen a {docDir}/assets/ y devuelve la ruta relativa para Markdown.
 */
async function pickAndCopyAsset(browserWindow, { documentPath }) {
  if (!documentPath) {
    return {
      ok: false,
      error: "Guarda el documento .md antes de insertar una imagen en assets/.",
    };
  }

  const result = await dialog.showOpenDialog(browserWindow, {
    title: "Insertar imagen",
    properties: ["openFile"],
    filters: [
      {
        name: "Imágenes",
        extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const sourcePath = result.filePaths[0];
  const ext = path.extname(sourcePath).toLowerCase();
  if (!IMAGE_EXT.has(ext)) {
    return { ok: false, error: "Formato de imagen no soportado." };
  }

  const docDir = path.dirname(documentPath);
  const assetsDir = path.join(docDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  const baseName = path.basename(sourcePath);
  let destName = baseName;
  let destPath = path.join(assetsDir, destName);
  let n = 1;

  while (true) {
    try {
      await fs.access(destPath);
      const parsed = path.parse(baseName);
      destName = `${parsed.name}-${n}${parsed.ext}`;
      destPath = path.join(assetsDir, destName);
      n += 1;
    } catch {
      break;
    }
  }

  await fs.copyFile(sourcePath, destPath);

  return {
    ok: true,
    relativePath: `assets/${destName}`,
    filePath: destPath,
  };
}

module.exports = { pickAndCopyAsset };
