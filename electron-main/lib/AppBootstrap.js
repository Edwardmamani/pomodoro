const { protocol, net, nativeImage, session } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')
const NoteModel = require('../models/NoteModel')

class AppBootstrap {
  constructor(appIconPath) {
    this.appIconPath = appIconPath
  }

  getAppIcon() {
    const image = nativeImage.createFromPath(this.appIconPath)
    return image.isEmpty() ? undefined : image
  }

  registerPrivilegedSchemes() {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'mdmedia',
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          bypassCSP: true,
          stream: true,
          corsEnabled: true
        }
      }
    ])
  }

  registerProtocols() {
    protocol.handle('mdmedia', (request) => {
      const filePath = NoteModel.absolutePathFromMediaUrl(request.url)
      if (!filePath) return new Response('Not found', { status: 404 })
      return net.fetch(pathToFileURL(filePath).href)
    })
  }

  configureSessionHeaders() {
    if (!session || !session.defaultSession) return
    const webRequest = session.defaultSession.webRequest

    webRequest.onBeforeSendHeaders({ urls: ['*://*.googlevideo.com/*'] }, (details, callback) => {
      const requestHeaders = { ...details.requestHeaders }
      requestHeaders['User-Agent'] =
        'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)'
      delete requestHeaders['Referer']
      delete requestHeaders['Origin']
      delete requestHeaders['referer']
      delete requestHeaders['origin']
      callback({ requestHeaders })
    })

    const mediaUrls = [
      '*://*.youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://*.googlevideo.com/*',
      '*://*.spotify.com/*'
    ]
    webRequest.onHeadersReceived({ urls: mediaUrls }, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }
      for (const key of Object.keys(responseHeaders)) {
        const lower = key.toLowerCase()
        if (lower === 'x-frame-options' || lower === 'frame-options') {
          delete responseHeaders[key]
        }
      }
      if (details.url.includes('googlevideo.com')) {
        responseHeaders['Access-Control-Allow-Origin'] = ['*']
      }
      callback({ responseHeaders })
    })
  }
}

module.exports = AppBootstrap
