/**
 * Distancia de edición de Levenshtein entre dos cadenas.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  const s = String(a)
  const t = String(b)
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m

  /** @type {number[]} */
  let prev = new Array(n + 1)
  /** @type {number[]} */
  let curr = new Array(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    const si = s.charCodeAt(i - 1)
    for (let j = 1; j <= n; j++) {
      const cost = si === t.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]
}

/**
 * Distancia orientada a autocompletado: Levenshtein entre la consulta
 * y el prefijo del candidato (misma longitud), para captar typos al escribir.
 */
export function tagMatchDistance(query, tag) {
  const q = String(query).trim().toLowerCase()
  const t = String(tag).toLowerCase()
  if (!q) return Number.POSITIVE_INFINITY
  if (t === q || t.startsWith(q)) return 0
  if (t.length >= q.length) {
    return levenshtein(q, t.slice(0, q.length))
  }
  return levenshtein(q, t)
}

/**
 * @param {string} query
 * @param {string[]} tags
 * @param {{ limit?: number, maxDistance?: number, exclude?: string[] }} [opts]
 * @returns {string[]}
 */
export function suggestTags(query, tags, opts = {}) {
  const q = String(query).trim()
  if (!q || !Array.isArray(tags) || tags.length === 0) return []

  const limit = opts.limit ?? 6
  const maxDistance =
    opts.maxDistance ?? Math.max(1, Math.floor(q.length / 2))
  const qLower = q.toLowerCase()
  const excluded = new Set(
    (opts.exclude || []).map((name) => String(name).toLowerCase())
  )

  return tags
    .map((name) => ({
      name,
      distance: tagMatchDistance(q, name)
    }))
    .filter(
      (item) =>
        item.distance <= maxDistance &&
        item.name.toLowerCase() !== qLower &&
        !excluded.has(item.name.toLowerCase())
    )
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    )
    .slice(0, limit)
    .map((item) => item.name)
}

/**
 * Separa tags por espacios: el fragmento actual es lo que sigue al último espacio.
 * @param {string} raw
 * @returns {{ prefix: string, current: string, committed: string[] }}
 */
export function parseTagInput(raw) {
  const text = String(raw ?? '')
  const lastSpace = text.lastIndexOf(' ')
  if (lastSpace === -1) {
    return { prefix: '', current: text, committed: [] }
  }
  const prefix = text.slice(0, lastSpace + 1)
  const current = text.slice(lastSpace + 1)
  const committed = prefix
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return { prefix, current, committed }
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function splitTags(raw) {
  return String(raw ?? '')
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
}
