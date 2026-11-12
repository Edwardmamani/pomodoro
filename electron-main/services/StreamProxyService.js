const http = require('http')
const https = require('https')
const StreamRangePipe = require('./StreamRangePipe')

const IOS_UA = 'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)'

class StreamProxyService {
  constructor(getStreamFn) {
    this.getStreamFn = getStreamFn
    this.server = null
    this.port = 0
  }

  async ensureServer() {
    if (this.server && this.port > 0) return this.port
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        try {
          const videoId = new URL(req.url, 'http://127.0.0.1').searchParams.get('id')
          if (!videoId) { res.writeHead(400); res.end(); return }
          const streamRes = await this.getStreamFn(videoId)
          if (!streamRes.ok || !streamRes.data) { res.writeHead(404); res.end(); return }
          await this.streamToClient(streamRes.data, req, res)
        } catch {
          if (!res.headersSent) res.writeHead(500)
          res.end()
        }
      })
      this.server.unref()
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port
        resolve(this.port)
      })
    })
  }

  async streamToClient(info, req, clientRes) {
    if (!info.remoteUrl) { clientRes.writeHead(404); clientRes.end(); return }
    const totalLength = Number(info.contentLength) || 0
    if (!totalLength) return this.pipeDirect(info, req, clientRes)

    let start = 0
    let end = totalLength - 1
    const match = req.headers.range?.match(/bytes=(\d+)-(\d*)/)
    if (match) {
      start = parseInt(match[1], 10)
      if (match[2]) end = Math.min(parseInt(match[2], 10), totalLength - 1)
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
    if (req.method === 'HEAD') { clientRes.end(); return }
    await StreamRangePipe.pipeSlices(info.remoteUrl, start, end, req, clientRes)
  }

  pipeDirect(info, req, clientRes) {
    const upReq = https.get(info.remoteUrl, { headers: { 'User-Agent': info.userAgent || IOS_UA } }, (upRes) => {
      clientRes.writeHead(upRes.statusCode || 200, {
        'Content-Type': info.mimeType || upRes.headers['content-type'] || 'audio/webm',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      })
      if (req.method === 'HEAD') { upRes.resume(); clientRes.end(); return }
      upRes.pipe(clientRes)
    })
    upReq.on('error', () => { if (!clientRes.headersSent) clientRes.writeHead(502); clientRes.end() })
    req.on('close', () => upReq.destroy())
  }
}

module.exports = StreamProxyService
