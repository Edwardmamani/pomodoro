const { execFile } = require('child_process')
const fs = require('fs')
const https = require('https')
const os = require('os')
const path = require('path')

const STREAM_TTL_MS = 25 * 60 * 1000
const IOS_UA = 'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)'
const DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

class YouTubeResolverService {
  constructor(metadataService) {
    this.metadata = metadataService
    this.streamCache = new Map()
  }

  findYtDlpBinary() {
    const candidates = [
      path.join(os.homedir(), '.local/bin/yt-dlp'), '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp',
      path.resolve(__dirname, '../../../youtube-api-v3/venv/bin/yt-dlp')
    ]
    return candidates.find((c) => fs.existsSync(c)) || 'yt-dlp'
  }
  runYtDlpJson(args) {
    return new Promise((resolve) => {
      execFile(this.findYtDlpBinary(), args, { timeout: 15000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err || !stdout) return resolve(null)
        try { resolve(JSON.parse(stdout)) } catch { resolve(null) }
      })
    })
  }

  async resolveAudioStream(videoId, port) {
    const cleanId = String(videoId || '').trim()
    if (!cleanId) return { ok: false, error: 'INVALID_VIDEO_ID' }
    const proxyUrl = `http://127.0.0.1:${port}/stream?id=${encodeURIComponent(cleanId)}`

    const cached = this.streamCache.get(cleanId)
    if (cached && Date.now() - cached.timestamp < STREAM_TTL_MS) {
      return { ok: true, data: { ...cached.data, url: proxyUrl } }
    }

    const ytRes = await this._resolveViaYtDlp(cleanId, proxyUrl)
    if (ytRes) return ytRes
    return this._resolveViaInnerTube(cleanId, proxyUrl)
  }

  async _resolveViaYtDlp(cleanId, proxyUrl) {
    const info = await this.runYtDlpJson([
      '-f', 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio/best',
      '--js-runtimes', 'node', '-j', '--no-playlist',
      `https://www.youtube.com/watch?v=${cleanId}`
    ])
    if (!info?.url) return null
    const cachedTitle = this.metadata.getCachedTitle(cleanId)
    const payload = {
      videoId: cleanId, url: proxyUrl, directUrl: info.url, remoteUrl: info.url,
      contentLength: Number(info.filesize || info.filesize_approx || 0),
      mimeType: info.ext === 'webm' ? 'audio/webm; codecs="opus"' : 'audio/mp4',
      userAgent: info.http_headers?.['User-Agent'] || DESKTOP_UA,
      bitrate: Math.round((info.abr || 128) * 1000),
      title: info.title || cachedTitle?.title || `Pista ${cleanId}`,
      author: info.uploader || cachedTitle?.author || '',
      duration: Number(info.duration) || 0,
      thumbnailUrl: info.thumbnail || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`
    }
    this.streamCache.set(cleanId, { timestamp: Date.now(), data: payload })
    return { ok: true, data: payload }
  }

  _resolveViaInnerTube(cleanId, proxyUrl) {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        videoId: cleanId,
        context: {
          client: {
            clientName: 'IOS', clientVersion: '20.03.02', deviceMake: 'Apple',
            deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '18.2.1.22C161', hl: 'es', gl: 'US'
          }
        }
      })
      const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), 'User-Agent': IOS_UA }
      const req = https.request('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', { method: 'POST', headers }, (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => resolve(this._parseInnerTubeResponse(cleanId, proxyUrl, body)))
      })
      req.on('error', (err) => resolve({ ok: false, error: err.message }))
      req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, error: 'TIMEOUT' }) })
      req.write(postData); req.end()
    })
  }

  _parseInnerTubeResponse(cleanId, proxyUrl, body) {
    try {
      const json = JSON.parse(body)
      if (json.playabilityStatus?.status !== 'OK') {
        return { ok: false, error: json.playabilityStatus?.reason || 'UNPLAYABLE', status: json.playabilityStatus?.status }
      }
      const audio = (json.streamingData?.adaptiveFormats || []).filter((f) => f.mimeType?.startsWith('audio/') && f.url)
      const byBitrate = (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
      const best = audio.filter((f) => f.mimeType.includes('audio/webm')).sort(byBitrate)[0] || audio.sort(byBitrate)[0]
      if (!best?.url) return { ok: false, error: 'NO_AUDIO_STREAM' }
      const d = json.videoDetails || {}
      const cached = this.metadata.getCachedTitle(cleanId)
      const payload = {
        videoId: cleanId, url: proxyUrl, remoteUrl: best.url, contentLength: Number(best.contentLength) || 0,
        mimeType: best.mimeType, bitrate: best.bitrate || 128000,
        title: d.title || cached?.title || `Pista ${cleanId}`, author: d.author || cached?.author || '',
        duration: Number(d.lengthSeconds) || Math.round(Number(best.approxDurationMs || 0) / 1000) || 0,
        thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`
      }
      this.streamCache.set(cleanId, { timestamp: Date.now(), data: payload })
      return { ok: true, data: payload }
    } catch (err) {
      return { ok: false, error: err.message || 'STREAM_PARSE_ERROR' }
    }
  }
}
module.exports = YouTubeResolverService
