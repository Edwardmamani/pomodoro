export class SpotifyUrlParser {
  static parse(url = '') {
    const clean = String(url || '').trim()
    if (!clean) return null

    let type = 'playlist'
    let id = null
    const match = clean.match(/spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/)
    if (match) {
      type = match[1]
      id = match[2]
    } else {
      const uriMatch = clean.match(/spotify:(playlist|track|album):([a-zA-Z0-9]+)/)
      if (uriMatch) {
        type = uriMatch[1]
        id = uriMatch[2]
      } else if (/^[a-zA-Z0-9]{22}$/.test(clean)) {
        id = clean
      }
    }
    if (!id) return null

    return {
      service: 'spotify',
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      appUrl: `spotify:${type}:${id}`
    }
  }
}
