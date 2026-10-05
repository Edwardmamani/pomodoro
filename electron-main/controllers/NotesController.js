const { dialog, BrowserWindow } = require('electron')
const NoteModel = require('../models/NoteModel')

function isValidId(taskId) {
  return taskId != null && taskId !== ''
}

class NotesController {
  constructor() {
    this.notes = new NoteModel()
  }

  async load(_event, taskId) {
    if (!isValidId(taskId)) return { ok: false, error: 'INVALID_ID' }
    return { ok: true, data: await this.notes.read(taskId) }
  }

  async save(_event, taskId, content) {
    if (!isValidId(taskId)) return { ok: false, error: 'INVALID_ID' }
    const filePath = await this.notes.write(taskId, content)
    return { ok: true, data: { filePath } }
  }

  async pickAsset(_event, taskId) {
    if (!isValidId(taskId)) return { ok: false, error: 'INVALID_ID' }

    this.notes.ensureDir(taskId)
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      title: 'Insertar imagen',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: NoteModel.IMAGE_EXTENSIONS }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: true, data: null }
    }

    const sourcePath = result.filePaths[0]
    if (!NoteModel.isImage(sourcePath)) {
      return { ok: false, error: 'UNSUPPORTED_IMAGE' }
    }

    return { ok: true, data: await this.notes.importAsset(taskId, sourcePath) }
  }

  mediaUrl(event, { documentPath, href } = {}) {
    event.returnValue = NoteModel.resolveMediaUrl(documentPath, href)
  }
}

module.exports = new NotesController()
