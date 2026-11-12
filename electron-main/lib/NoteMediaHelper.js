const path = require('path')

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'])

class NoteMediaHelper {
  static IMAGE_EXTENSIONS = [...IMAGE_EXT].map((ext) => ext.slice(1))

  static isImage(filePath) {
    return IMAGE_EXT.has(path.extname(filePath).toLowerCase())
  }

  static resolveMediaUrl(documentPath, href) {
    if (!href || typeof href !== 'string') return ''

    let trimmed = href.trim().replace(/^<|>$/g, '')
    if (/^(https?:|data:|blob:|mdmedia:)/i.test(trimmed)) {
      return trimmed
    }

    if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
      try {
        trimmed = decodeURIComponent(trimmed)
      } catch {
        /* keep trimmed */
      }
    }

    if (!documentPath) return ''

    const docDir = path.dirname(documentPath)
    const absolute = path.resolve(docDir, trimmed)
    const relative = path.relative(docDir, absolute)

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return ''
    }

    return `mdmedia://local/${encodeURIComponent(absolute)}`
  }

  static absolutePathFromMediaUrl(requestUrl) {
    try {
      const u = new URL(requestUrl)
      const encoded = u.pathname.replace(/^\//, '')
      return decodeURIComponent(encoded)
    } catch {
      return null
    }
  }
}

module.exports = NoteMediaHelper
