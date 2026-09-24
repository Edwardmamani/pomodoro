/** Paleta de puntos para chips de etiqueta (colores suaves sobre fondo oscuro). */
const TAG_DOT_COLORS = [
  '#7dd3fc', // sky
  '#c4b5fd', // violet
  '#86efac', // green
  '#fcd34d', // amber
  '#f9a8d4', // pink
  '#67e8f9', // cyan
  '#fdba74', // orange
  '#a5b4fc' // indigo
]

/**
 * Color estable por nombre de etiqueta (hash simple).
 * @param {string} name
 * @returns {string}
 */
export function tagDotColor(name) {
  const s = String(name || '').toLowerCase()
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  return TAG_DOT_COLORS[hash % TAG_DOT_COLORS.length]
}
