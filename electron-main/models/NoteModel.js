const { app } = require('electron')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

const IMAGE_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp'
])

class NoteModel {
  static IMAGE_EXTENSIONS = [...IMAGE_EXT].map((ext) => ext.slice(1))

  root() {
    return path.join(app.getPath('userData'), 'tasks')
  }

  dirFor(taskId) {
    return path.join(this.root(), String(taskId))
  }

  pathFor(taskId) {
    return path.join(this.dirFor(taskId), 'note.md')
  }

  ensureDir(taskId) {
    const dir = this.dirFor(taskId)
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true })
    return dir
  }

  async read(taskId) {
    this.ensureDir(taskId)
    const filePath = this.pathFor(taskId)
    let content = ''
    try {
      content = await fsp.readFile(filePath, 'utf8')
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    return { content, filePath }
  }

  async write(taskId, content) {
    this.ensureDir(taskId)
    const filePath = this.pathFor(taskId)
    await fsp.writeFile(filePath, content ?? '', 'utf8')
    return filePath
  }

  /** Copia la imagen a assets/ sin pisar archivos existentes. */
  async importAsset(taskId, sourcePath) {
    this.ensureDir(taskId)
    const assetsDir = path.join(this.dirFor(taskId), 'assets')
    await fsp.mkdir(assetsDir, { recursive: true })

    const baseName = path.basename(sourcePath)
    let destName = baseName
    let destPath = path.join(assetsDir, destName)
    let n = 1

    while (true) {
      try {
        await fsp.access(destPath)
        const parsed = path.parse(baseName)
        destName = `${parsed.name}-${n}${parsed.ext}`
        destPath = path.join(assetsDir, destName)
        n += 1
      } catch {
        break
      }
    }

    await fsp.copyFile(sourcePath, destPath)
    return { relativePath: `assets/${destName}`, filePath: destPath }
  }

  removeForTask(taskId) {
    if (taskId == null || taskId === '') return
    fs.rmSync(this.dirFor(taskId), { recursive: true, force: true })
  }

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

module.exports = NoteModel
