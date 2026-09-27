import { insertAtCursor } from "./_helpers.js";

/** CommonMark: espacios/paréntesis en la URL requieren `<...>`. */
export function formatImageHref(relativePath) {
  if (/[\s()[\]<>]/.test(relativePath)) {
    return `<${relativePath}>`;
  }
  return relativePath;
}

/**
 * Inserta ![alt](path). Si no hay path, deja placeholder.
 */
export function image(view, relativePath = "assets/imagen.png", alt = "imagen") {
  const href = formatImageHref(relativePath);
  const insert = `![${alt}](${href})`;
  const urlStart = alt.length + 4;
  insertAtCursor(view, insert, urlStart, href.length);
}
