const { app, dialog, BrowserWindow } = require('electron')
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

function getTasksRoot() {
  return path.join(app.getPath('userData'), 'tasks')
}

function getTaskDir(taskId) {
  return path.join(getTasksRoot(), String(taskId))
}

function pathFor(taskId) {
  return path.join(getTaskDir(taskId), 'note.md')
}

function ensureTaskDir(taskId) {
  const dir = getTaskDir(taskId)
  const assetsDir = path.join(dir, 'assets')
  fs.mkdirSync(assetsDir, { recursive: true })
  return dir
}

async function load(taskId) {
  if (taskId == null || taskId === '') {
    return { ok: false, error: 'INVALID_ID' }
  }

  const filePath = pathFor(taskId)
  ensureTaskDir(taskId)

  let content = ''
  try {
    content = await fsp.readFile(filePath, 'utf8')
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }

  return { ok: true, data: { content, filePath } }
}

async function save(taskId, content) {
  if (taskId == null || taskId === '') {
    return { ok: false, error: 'INVALID_ID' }
  }

  ensureTaskDir(taskId)
  const filePath = pathFor(taskId)
  await fsp.writeFile(filePath, content ?? '', 'utf8')
  return { ok: true, data: { filePath } }
}

async function pickAsset(taskId) {
  if (taskId == null || taskId === '') {
    return { ok: false, error: 'INVALID_ID' }
  }

  ensureTaskDir(taskId)
  const documentPath = pathFor(taskId)
  const win = BrowserWindow.getFocusedWindow()

  const result = await dialog.showOpenDialog(win, {
    title: 'Insertar imagen',
    properties: ['openFile'],
    filters: [
      {
        name: 'Imágenes',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']
      }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: true, data: null }
  }

  const sourcePath = result.filePaths[0]
  const ext = path.extname(sourcePath).toLowerCase()
  if (!IMAGE_EXT.has(ext)) {
    return { ok: false, error: 'UNSUPPORTED_IMAGE' }
  }

  const assetsDir = path.join(path.dirname(documentPath), 'assets')
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

  return {
    ok: true,
    data: {
      relativePath: `assets/${destName}`,
      filePath: destPath
    }
  }
}

function resolveMediaUrl(documentPath, href) {
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

function absolutePathFromMediaUrl(requestUrl) {
  try {
    const u = new URL(requestUrl)
    const encoded = u.pathname.replace(/^\//, '')
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

function removeForTask(taskId) {
  if (taskId == null || taskId === '') return
  const dir = getTaskDir(taskId)
  fs.rmSync(dir, { recursive: true, force: true })
}

module.exports = {
  pathFor,
  load,
  save,
  pickAsset,
  resolveMediaUrl,
  absolutePathFromMediaUrl,
  removeForTask
}
