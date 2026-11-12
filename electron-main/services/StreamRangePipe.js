const https = require('https')

const SLICE_SIZE = 512 * 1024
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 6 })
const IOS_UA = 'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)'

class StreamRangePipe {
  static fetchSlice(streamUrl, start, end, redirects = 0) {
    return new Promise((resolve, reject) => {
      if (redirects > 5) return reject(new Error('TOO_MANY_REDIRECTS'))
      const req = https.get(
        streamUrl,
        { agent: httpsAgent, headers: { 'User-Agent': IOS_UA, Range: `bytes=${start}-${end}` } },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume()
            return StreamRangePipe.fetchSlice(res.headers.location, start, end, redirects + 1).then(resolve, reject)
          }
          if (res.statusCode !== 200 && res.statusCode !== 206) {
            res.resume()
            return reject(new Error(`UPSTREAM_HTTP_${res.statusCode}`))
          }
          resolve(res)
        }
      )
      req.on('error', reject)
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('SLICE_TIMEOUT')) })
    })
  }

  static async pipeSlices(url, start, end, req, clientRes) {
    let cursor = start
    let aborted = false
    req.on('close', () => { aborted = true })
    const fetchRetry = async (s, e) => {
      for (let i = 0; i < 3; i++) {
        if (aborted || clientRes.destroyed) throw new Error('ABORTED')
        try { return await StreamRangePipe.fetchSlice(url, s, e) } catch (err) {
          if (i === 2) throw err
          await new Promise((r) => setTimeout(r, 200 * (i + 1)))
        }
      }
    }
    let nextP = cursor <= end ? fetchRetry(cursor, Math.min(cursor + SLICE_SIZE - 1, end)) : null
    while (cursor <= end && !aborted && !clientRes.destroyed && nextP) {
      const nextStart = Math.min(cursor + SLICE_SIZE - 1, end) + 1
      const upcoming = nextStart <= end ? fetchRetry(nextStart, Math.min(nextStart + SLICE_SIZE - 1, end)) : null
      upcoming?.catch(() => {})
      try {
        const upRes = await nextP
        await new Promise((res, rej) => {
          upRes.on('data', (c) => {
            if (!aborted && !clientRes.destroyed && !clientRes.write(c)) {
              upRes.pause()
              clientRes.once('drain', () => upRes.resume())
            }
          })
          upRes.on('end', res)
          upRes.on('error', rej)
        })
        cursor = nextStart
        nextP = upcoming
      } catch { break }
    }
    if (!clientRes.destroyed) clientRes.end()
  }
}

module.exports = StreamRangePipe
