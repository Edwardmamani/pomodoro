const { app } = require('electron')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const { formatDateLongSpanish } = require('../lib/date')
const NoteMediaHelper = require('../lib/NoteMediaHelper')

class NoteModel {
  static IMAGE_EXTENSIONS = NoteMediaHelper.IMAGE_EXTENSIONS
  static isImage = NoteMediaHelper.isImage
  static resolveMediaUrl = NoteMediaHelper.resolveMediaUrl
  static absolutePathFromMediaUrl = NoteMediaHelper.absolutePathFromMediaUrl

  root() {
    return path.join(app.getPath('userData'), 'tasks')
  }

  dirFor(taskId, routineId = null) {
    if (routineId != null && routineId !== '') {
      return path.join(this.root(), `routine_${routineId}`)
    }
    return path.join(this.root(), String(taskId))
  }

  pathFor(taskId, routineId = null) {
    return path.join(this.dirFor(taskId, routineId), 'note.md')
  }

  ensureDir(taskId, routineId = null) {
    const dir = this.dirFor(taskId, routineId)
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true })
    return dir
  }

  ensureDailyHeader(content, dateOrIso = new Date()) {
    const header = `### ${formatDateLongSpanish(dateOrIso)}`
    const text = content ?? ''
    const trimmed = text.trim()
    if (!trimmed) return `${header}\n\n`
    if (
      trimmed.includes(header) ||
      (typeof dateOrIso === 'string' && trimmed.includes(`### ${dateOrIso}`))
    ) {
      return text
    }
    return `${header}\n\n${text}`
  }

  async read(taskId, routineId = null) {
    this.ensureDir(taskId, routineId)
    const filePath = this.pathFor(taskId, routineId)
    let content = ''
    try {
      content = await fsp.readFile(filePath, 'utf8')
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    return { content, filePath }
  }

  async write(taskId, content, routineId = null) {
    this.ensureDir(taskId, routineId)
    const filePath = this.pathFor(taskId, routineId)
    await fsp.writeFile(filePath, content ?? '', 'utf8')
    return filePath
  }

  async importAsset(taskId, sourcePath, routineId = null) {
    this.ensureDir(taskId, routineId)
    const assetsDir = path.join(this.dirFor(taskId, routineId), 'assets')
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

  removeForRoutine(routineId) {
    if (routineId == null || routineId === '') return
    fs.rmSync(path.join(this.root(), `routine_${routineId}`), {
      recursive: true,
      force: true
    })
  }
}

module.exports = NoteModel
