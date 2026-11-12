const https = require('https')

const TTL_MS = 25 * 60 * 1000
const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

class YouTubeMetadataService {
  constructor() {
    this.titleCache = new Map()
    this.playlistCache = new Map()
  }

  extractPlaylistId(input) {
    if (!input) return ''
    const str = String(input).trim()
    try {
      if (str.includes('://') || str.includes('list=')) {
        const list = new URL(str.startsWith('http') ? str : `https://${str}`).searchParams.get('list')
        if (list) return list.trim()
      }
    } catch {
      const match = str.match(/[?&]list=([a-zA-Z0-9_-]+)/)
      if (match) return match[1]
    }
    return str.split('&')[0].trim()
  }
  getCachedTitle(videoId) { return this.titleCache.get(videoId) }

  async fetchPlaylistTracks(rawPlaylistId) {
    const playlistId = this.extractPlaylistId(rawPlaylistId)
    if (!playlistId) return { ok: false, error: 'INVALID_PLAYLIST_ID' }

    const cached = this.playlistCache.get(playlistId)
    if (cached && Date.now() - cached.timestamp < TTL_MS && cached.data.tracks.length > 0) {
      return { ok: true, data: cached.data }
    }

    return new Promise((resolve) => {
      const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=es`
      const req = https.get(
        url,
        { headers: { 'User-Agent': DESKTOP_UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' } },
        (res) => {
          let body = ''
          res.on('data', (c) => (body += c))
          res.on('end', () => resolve(this._parsePlaylistHtml(playlistId, body)))
        }
      )
      req.on('error', (err) => resolve({ ok: false, error: err.message, data: { playlistId, tracks: [] } }))
      req.setTimeout(8000, () => {
        req.destroy()
        resolve({ ok: false, error: 'TIMEOUT', data: { playlistId, tracks: [] } })
      })
    })
  }

  _parsePlaylistHtml(playlistId, body) {
    try {
      const match = body.match(/var ytInitialData = (\{.*?\});<\/script>/)
      if (!match) return { ok: false, error: 'PARSE_ERROR', data: { playlistId, tracks: [] } }
      const data = JSON.parse(match[1])
      const title =
        data?.metadata?.playlistMetadataRenderer?.title ||
        data?.header?.playlistHeaderRenderer?.title?.simpleText || ''
      const sections =
        data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
      const rawItems =
        sections.find((s) => Array.isArray(s?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents))
          ?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || []

      const tracks = []
      for (const item of rawItems) {
        const v = item.playlistVideoRenderer
        if (!v?.videoId) continue
        const tTitle = v.title?.runs?.[0]?.text || v.title?.simpleText || `Pista ${tracks.length + 1}`
        const author = v.shortBylineText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || ''
        const duration = Number(v.lengthSeconds) || 0
        this.titleCache.set(v.videoId, { title: tTitle, author, duration })
        tracks.push({
          index: tracks.length, videoId: v.videoId, title: tTitle, author, duration,
          durationText: v.lengthText?.simpleText || '',
          thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`
        })
      }
      const payload = { playlistId, title, tracks }
      if (tracks.length > 0) this.playlistCache.set(playlistId, { timestamp: Date.now(), data: payload })
      return { ok: true, data: payload }
    } catch (err) {
      return { ok: false, error: err.message || 'PARSE_FAILED', data: { playlistId, tracks: [] } }
    }
  }

  async fetchTrackTitles(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { ok: true, data: {} }
    const results = {}
    await Promise.all(ids.slice(0, 60).map((id) => this._fetchSingleTitle(id, results)))
    return { ok: true, data: results }
  }

  _fetchSingleTitle(id, results) {
    if (this.titleCache.has(id)) { results[id] = this.titleCache.get(id); return Promise.resolve() }
    return new Promise((resolve) => {
      const req = https.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => {
          try {
            const j = JSON.parse(body)
            results[id] = { title: j.title || `Pista ${id}`, author: j.author_name || '' }
            this.titleCache.set(id, results[id])
          } catch { results[id] = { title: `Pista ${id}`, author: '' } }
          resolve()
        })
      })
      req.on('error', () => { results[id] = { title: `Pista ${id}`, author: '' }; resolve() })
      req.setTimeout(3500, () => { req.destroy(); results[id] = { title: `Pista ${id}`, author: '' }; resolve() })
    })
  }
}
module.exports = YouTubeMetadataService
