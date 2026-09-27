const path = require("node:path");
const { pathToFileURL } = require("node:url");

/**
 * Resuelve href de Markdown a URL cargable en el renderer (http/data/mdmedia).
 */
function resolveMediaUrl(documentPath, href) {
  if (!href || typeof href !== "string") return "";

  let trimmed = href.trim().replace(/^<|>$/g, "");
  if (/^(https?:|data:|blob:|mdmedia:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
    try {
      trimmed = decodeURIComponent(trimmed);
    } catch {
      /* mantener trimmed sin decodificar */
    }
  }

  if (!documentPath) return "";

  const docDir = path.dirname(documentPath);
  const absolute = path.resolve(docDir, trimmed);
  const relative = path.relative(docDir, absolute);

  // Solo archivos bajo la carpeta del documento (p.ej. assets/)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return "";
  }

  return `mdmedia://local/${encodeURIComponent(absolute)}`;
}

function absolutePathFromMediaUrl(requestUrl) {
  try {
    const u = new URL(requestUrl);
    const encoded = u.pathname.replace(/^\//, "");
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

module.exports = {
  resolveMediaUrl,
  absolutePathFromMediaUrl,
  pathToFileURL,
};
