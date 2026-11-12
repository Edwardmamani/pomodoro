const { shell } = require('electron')
const http = require('http')
const https = require('https')
const PlaylistModel = require('../models/PlaylistModel')
const SettingsModel = require('../models/SettingsModel')

const titleCache = new Map()
const playlistCache = new Map()
const streamCache = new Map()

const STREAM_TTL_MS = 25 * 60 * 1000 // 25 minutos
const SLICE_SIZE = 512 * 1024 // 512 KB por bloque para googlevideo.com
const IOS_USER_AGENT =
  'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)'
const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

let proxyServer = null
let proxyPort = 0

function extractPlaylistId(input) {
  if (!input) return ''
  const str = String(input).trim()
  try {
    if (str.includes('://') || str.includes('list=')) {
      const url = new URL(str.startsWith('http') ? str : `https://${str}`)
      const list = url.searchParams.get('list')
      if (list) return list.trim()
    }
  } catch {
    const match = str.match(/[?&]list=([a-zA-Z0-9_-]+)/)
    if (match) return match[1]
  }
  return str.split('&')[0].trim()
}

function fetchRangeSlice(streamUrl, sliceStart, sliceEnd, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('TOO_MANY_REDIRECTS'))
      return
    }
    const req = https.get(
      streamUrl,
      {
        headers: {
          'User-Agent': IOS_USER_AGENT,
          Range: `bytes=${sliceStart}-${sliceEnd}`
        }
      },
      (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume()
          fetchRangeSlice(res.headers.location, sliceStart, sliceEnd, redirects + 1)
            .then(resolve)
            .catch(reject)
          return
        }
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          res.resume()
          reject(new Error(`UPSTREAM_HTTP_${res.statusCode}`))
          return
        }
        resolve(res)
      }
    )
    req.on('error', reject)
    req.setTimeout(8000, () => {
      req.destroy()
      reject(new Error('SLICE_TIMEOUT'))
    })
  })
}

async function streamVideoToClient(info, req, clientRes) {
  const totalLength = Number(info.contentLength) || 0
  if (!totalLength || !info.remoteUrl) {
    clientRes.writeHead(404)
    clientRes.end()
    return
  }

  let start = 0
  let end = totalLength - 1

  if (req.headers.range) {
    const match = req.headers.range.match(/bytes=(\d+)-(\d*)/)
    if (match) {
      start = parseInt(match[1], 10)
      if (match[2]) {
        end = Math.min(parseInt(match[2], 10), totalLength - 1)
      }
    }
  }

  if (start >= totalLength || start > end) {
    clientRes.writeHead(416, { 'Content-Range': `bytes */${totalLength}` })
    clientRes.end()
    return
  }

  clientRes.writeHead(req.headers.range ? 206 : 200, {
    'Content-Type': info.mimeType || 'audio/webm',
    'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${totalLength}`,
    'Content-Length': String(end - start + 1),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  })

  if (req.method === 'HEAD') {
    clientRes.end()
    return
  }

  let cursor = start
  let aborted = false
  req.on('close', () => {
    aborted = true
  })

  while (cursor <= end && !aborted && !clientRes.destroyed) {
    const sliceEnd = Math.min(cursor + SLICE_SIZE - 1, end)
    try {
      const upRes = await fetchRangeSlice(info.remoteUrl, cursor, sliceEnd)
      await new Promise((resolve, reject) => {
        upRes.on('data', (chunk) => {
          if (!aborted && !clientRes.destroyed) {
            clientRes.write(chunk)
          }
        })
        upRes.on('end', resolve)
        upRes.on('error', reject)
      })
      cursor = sliceEnd + 1
    } catch {
      break
    }
  }

  if (!clientRes.destroyed) {
    clientRes.end()
  }
}

class MusicController {
  constructor() {
    this.playlists = new PlaylistModel()
    this.settings = new SettingsModel()
  }

  async ensureProxyServer() {
    if (proxyServer && proxyPort > 0) return proxyPort

    return new Promise((resolve) => {
      proxyServer = http.createServer(async (req, clientRes) => {
        try {
          const parsedUrl = new URL(req.url, 'http://127.0.0.1')
          const videoId = parsedUrl.searchParams.get('id')
          if (!videoId) {
            clientRes.writeHead(400)
            clientRes.end()
            return
          }
          const streamRes = await this.getAudioStream(null, videoId)
          if (!streamRes.ok || !streamRes.data) {
            clientRes.writeHead(404)
            clientRes.end()
            return
          }
          await streamVideoToClient(streamRes.data, req, clientRes)
        } catch {
          if (!clientRes.headersSent) clientRes.writeHead(500)
          clientRes.end()
        }
      })

      // No bloquear el cierre del proceso de Node en pruebas unitarias
      proxyServer.unref()

      proxyServer.listen(0, '127.0.0.1', () => {
        proxyPort = proxyServer.address().port
        resolve(proxyPort)
      })
    })
  }

  list() {
    return { ok: true, data: this.playlists.list() }
  }

  getActive() {
    return { ok: true, data: this.activePlaylist() }
  }

  select(_event, id) {
    const playlist = this.playlists.getById(id)
    if (!playlist) return { ok: false, error: 'NOT_FOUND' }
    this.settings.setMany({ active_playlist_id: id, last_playlist_id: id })
    return { ok: true, data: playlist }
  }

  async open() {
    const playlist = this.activePlaylist()
    if (!playlist) return { ok: false, error: 'NO_PLAYLIST' }
    await shell.openExternal(playlist.external_url)
    return { ok: true, data: playlist }
  }

  add(_event, input) {
    input = input || {}
    const name = String(input.name || '').trim()
    const externalUrl = String(input.external_url || '').trim()
    if (!name || !externalUrl) return { ok: false, error: 'INVALID_INPUT' }

    const id = this.playlists.create({
      service: input.service || 'youtube',
      name,
      externalUrl,
      externalId: input.external_id || extractPlaylistId(externalUrl) || null
    })
    return { ok: true, data: this.playlists.getById(id) }
  }

  delete(_event, id) {
    const target = this.playlists.getById(id)
    if (!target) return { ok: false, error: 'NOT_FOUND' }

    const active = this.activePlaylist()
    const deleted = this.playlists.delete(id)
    if (!deleted) return { ok: false, error: 'DELETE_FAILED' }

    if (active && String(active.id) === String(id)) {
      const remaining = this.playlists.list()
      const next = remaining.find((p) => p.service === 'youtube') || remaining[0] || null
      this.settings.setMany({
        active_playlist_id: next ? String(next.id) : '',
        last_playlist_id: next ? String(next.id) : ''
      })
    }

    return { ok: true, data: this.activePlaylist() }
  }

  async fetchPlaylistTracks(_event, rawPlaylistId) {
    const playlistId = extractPlaylistId(rawPlaylistId)
    if (!playlistId) return { ok: false, error: 'INVALID_PLAYLIST_ID' }

    if (playlistCache.has(playlistId)) {
      const cached = playlistCache.get(playlistId)
      if (Date.now() - cached.timestamp < STREAM_TTL_MS && cached.data.tracks.length > 0) {
        return { ok: true, data: cached.data }
      }
    }

    return new Promise((resolve) => {
      const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=es`
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': DESKTOP_USER_AGENT,
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          }
        },
        (res) => {
          let body = ''
          res.on('data', (c) => (body += c))
          res.on('end', () => {
            try {
              const match = body.match(/var ytInitialData = (\{.*?\});<\/script>/)
              if (!match) {
                resolve({ ok: false, error: 'PARSE_ERROR', data: { playlistId, tracks: [] } })
                return
              }
              const data = JSON.parse(match[1])
              const playlistTitle =
                data?.metadata?.playlistMetadataRenderer?.title ||
                data?.header?.playlistHeaderRenderer?.title?.simpleText ||
                ''

              const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || []
              const sectionContents =
                tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
              let rawItems = []
              for (const sec of sectionContents) {
                const items =
                  sec?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents
                if (Array.isArray(items) && items.length > 0) {
                  rawItems = items
                  break
                }
              }

              const tracks = []
              for (const item of rawItems) {
                const v = item.playlistVideoRenderer
                if (!v || !v.videoId) continue
                const title =
                  v.title?.runs?.[0]?.text ||
                  v.title?.simpleText ||
                  `Pista ${tracks.length + 1}`
                const author =
                  v.shortBylineText?.runs?.[0]?.text ||
                  v.longBylineText?.runs?.[0]?.text ||
                  ''
                const duration = Number(v.lengthSeconds) || 0
                const durationText = v.lengthText?.simpleText || ''
                const index = tracks.length

                titleCache.set(v.videoId, { title, author, duration })

                tracks.push({
                  index,
                  videoId: v.videoId,
                  title,
                  author,
                  duration,
                  durationText,
                  thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`
                })
              }

              const payload = { playlistId, title: playlistTitle, tracks }
              if (tracks.length > 0) {
                playlistCache.set(playlistId, { timestamp: Date.now(), data: payload })
              }
              resolve({ ok: true, data: payload })
            } catch (err) {
              resolve({
                ok: false,
                error: err.message || 'PARSE_FAILED',
                data: { playlistId, tracks: [] }
              })
            }
          })
        }
      )

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message, data: { playlistId, tracks: [] } })
      })

      req.setTimeout(8000, () => {
        req.destroy()
        resolve({ ok: false, error: 'TIMEOUT', data: { playlistId, tracks: [] } })
      })
    })
  }

  async getAudioStream(_event, videoId) {
    const cleanId = String(videoId || '').trim()
    if (!cleanId) return { ok: false, error: 'INVALID_VIDEO_ID' }

    const port = await this.ensureProxyServer()

    if (streamCache.has(cleanId)) {
      const cached = streamCache.get(cleanId)
      if (Date.now() - cached.timestamp < STREAM_TTL_MS) {
        return {
          ok: true,
          data: {
            ...cached.data,
            url: `http://127.0.0.1:${port}/stream?id=${encodeURIComponent(cleanId)}`
          }
        }
      }
    }

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        videoId: cleanId,
        context: {
          client: {
            clientName: 'IOS',
            clientVersion: '20.03.02',
            deviceMake: 'Apple',
            deviceModel: 'iPhone16,2',
            osName: 'iPhone',
            osVersion: '18.2.1.22C161',
            hl: 'es',
            gl: 'US'
          }
        }
      })

      const req = https.request(
        'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': IOS_USER_AGENT
          }
        },
        (res) => {
          let body = ''
          res.on('data', (c) => (body += c))
          res.on('end', () => {
            try {
              const json = JSON.parse(body)
              if (json.playabilityStatus?.status !== 'OK') {
                resolve({
                  ok: false,
                  error: json.playabilityStatus?.reason || 'UNPLAYABLE',
                  status: json.playabilityStatus?.status
                })
                return
              }

              const adaptive = json.streamingData?.adaptiveFormats || []
              const audioFormats = adaptive.filter(
                (f) => f.mimeType && f.mimeType.startsWith('audio/') && f.url
              )
              // Preferir audio/webm (Opus) soportado nativamente por libffmpeg de Electron
              const webmAudio = audioFormats
                .filter((f) => f.mimeType.includes('audio/webm'))
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
              const best =
                webmAudio[0] ||
                audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]

              if (!best || !best.url) {
                resolve({ ok: false, error: 'NO_AUDIO_STREAM' })
                return
              }

              const details = json.videoDetails || {}
              const payload = {
                videoId: cleanId,
                url: `http://127.0.0.1:${port}/stream?id=${encodeURIComponent(cleanId)}`,
                remoteUrl: best.url,
                contentLength: Number(best.contentLength) || 0,
                mimeType: best.mimeType,
                bitrate: best.bitrate || 128000,
                title: details.title || titleCache.get(cleanId)?.title || `Pista ${cleanId}`,
                author: details.author || titleCache.get(cleanId)?.author || '',
                duration:
                  Number(details.lengthSeconds) ||
                  Math.round(Number(best.approxDurationMs || 0) / 1000) ||
                  0,
                thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`
              }

              streamCache.set(cleanId, { timestamp: Date.now(), data: payload })
              resolve({ ok: true, data: payload })
            } catch (err) {
              resolve({ ok: false, error: err.message || 'STREAM_PARSE_ERROR' })
            }
          })
        }
      )

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message })
      })

      req.setTimeout(8000, () => {
        req.destroy()
        resolve({ ok: false, error: 'TIMEOUT' })
      })

      req.write(postData)
      req.end()
    })
  }

  async fetchTrackTitles(_event, ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { ok: true, data: {} }
    const results = {}
    const toFetch = ids.slice(0, 60)
    await Promise.all(
      toFetch.map((id) =>
        new Promise((resolve) => {
          if (titleCache.has(id)) {
            results[id] = titleCache.get(id)
            resolve()
            return
          }
          const req = https.get(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
            (res) => {
              let body = ''
              res.on('data', (c) => (body += c))
              res.on('end', () => {
                try {
                  const json = JSON.parse(body)
                  const info = {
                    title: json.title || `Pista ${id}`,
                    author: json.author_name || ''
                  }
                  titleCache.set(id, info)
                  results[id] = info
                } catch {
                  results[id] = { title: `Pista ${id}`, author: '' }
                }
                resolve()
              })
            }
          )
          req.on('error', () => {
            results[id] = { title: `Pista ${id}`, author: '' }
            resolve()
          })
          req.setTimeout(3500, () => {
            req.destroy()
            results[id] = { title: `Pista ${id}`, author: '' }
            resolve()
          })
        })
      )
    )
    return { ok: true, data: results }
  }

  activePlaylist() {
    const { active_playlist_id: id } = this.settings.getAll()
    let playlist = id ? this.playlists.getById(id) : null
    if (!playlist) {
      const all = this.playlists.list()
      // Preferir YouTube como primera opción si no hay activa
      playlist = all.find((p) => p.service === 'youtube') || all[0] || null
      if (playlist) {
        this.settings.setMany({
          active_playlist_id: String(playlist.id),
          last_playlist_id: String(playlist.id)
        })
      }
    }
    return playlist
  }
}

module.exports = new MusicController()
