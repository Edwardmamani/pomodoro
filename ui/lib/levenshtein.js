export class TagMatcher {
  static levenshtein(a, b) {
    const s = String(a)
    const t = String(b)
    const m = s.length
    const n = t.length
    if (m === 0) return n
    if (n === 0) return m

    let prev = Array.from({ length: n + 1 }, (_, j) => j)
    let curr = new Array(n + 1)

    for (let i = 1; i <= m; i++) {
      curr[0] = i
      const si = s.charCodeAt(i - 1)
      for (let j = 1; j <= n; j++) {
        const cost = si === t.charCodeAt(j - 1) ? 0 : 1
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      }
      ;[prev, curr] = [curr, prev]
    }
    return prev[n]
  }

  static tagMatchDistance(query, tag) {
    const q = String(query).trim().toLowerCase()
    const t = String(tag).toLowerCase()
    if (!q) return Number.POSITIVE_INFINITY
    if (t === q || t.startsWith(q)) return 0
    return TagMatcher.levenshtein(q, t.length >= q.length ? t.slice(0, q.length) : t)
  }

  static suggestTags(query, tags, opts = {}) {
    const q = String(query).trim()
    if (!q || !Array.isArray(tags) || tags.length === 0) return []
    const limit = opts.limit ?? 6
    const maxDistance = opts.maxDistance ?? Math.max(1, Math.floor(q.length / 2))
    const qLower = q.toLowerCase()
    const excluded = new Set((opts.exclude || []).map((name) => String(name).toLowerCase()))

    return tags
      .map((name) => ({ name, distance: TagMatcher.tagMatchDistance(q, name) }))
      .filter((item) => item.distance <= maxDistance && item.name.toLowerCase() !== qLower && !excluded.has(item.name.toLowerCase()))
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      .slice(0, limit)
      .map((item) => item.name)
  }

  static parseTagInput(raw) {
    const text = String(raw ?? '')
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace === -1) return { prefix: '', current: text, committed: [] }
    const prefix = text.slice(0, lastSpace + 1)
    return { prefix, current: text.slice(lastSpace + 1), committed: prefix.trim().split(/\s+/).filter(Boolean) }
  }

  static splitTags(raw) {
    return String(raw ?? '').trim().split(/\s+/).map((t) => t.trim()).filter(Boolean)
  }
}

export const levenshtein = TagMatcher.levenshtein
export const tagMatchDistance = TagMatcher.tagMatchDistance
export const suggestTags = TagMatcher.suggestTags
export const parseTagInput = TagMatcher.parseTagInput
export const splitTags = TagMatcher.splitTags
