const { dialog, BrowserWindow } = require('electron')
const NoteModel = require('../models/NoteModel')
const TaskModel = require('../models/TaskModel')

function isValidId(taskId) {
  return taskId != null && taskId !== ''
}

class NotesController {
  constructor() {
    this.notes = new NoteModel()
    this.taskModel = new TaskModel()
  }

  getRoutineId(taskId) {
    try {
      const task = this.taskModel.getById(taskId)
      return task?.routine_id || null
    } catch {
      return null
    }
  }

  async load(_event, taskId) {
    if (!isValidId(taskId)) return { ok: false, error: 'INVALID_ID' }
    const routineId = this.getRoutineId(taskId)
    const readResult = await this.notes.read(taskId, routineId)
    let content = readResult.content

    if (routineId) {
      const task = this.taskModel.getById(taskId)
      content = this.notes.ensureDailyHeader(content, task?.due_date || new Date())
    }

    return {
      ok: true,
      data: {
        content,
        filePath: readResult.filePath,
        isRoutine: Boolean(routineId),
        routineId
      }
    }
  }

  async save(_event, taskId, content) {
    if (!isValidId(taskId)) return { ok: false, error: 'INVALID_ID' }
    const routineId = this.getRoutineId(taskId)
    const filePath = await this.notes.write(taskId, content, routineId)
    return { ok: true, data: { filePath, isRoutine: Boolean(routineId), routineId } }
  }

  async pickAsset(_event, taskId) {
    if (!isValidId(taskId)) return { ok: false, error: 'INVALID_ID' }
    const routineId = this.getRoutineId(taskId)

    this.notes.ensureDir(taskId, routineId)
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

    return {
      ok: true,
      data: await this.notes.importAsset(taskId, sourcePath, routineId)
    }
  }

  mediaUrl(event, { documentPath, href } = {}) {
    event.returnValue = NoteModel.resolveMediaUrl(documentPath, href)
  }
}

module.exports = new NotesController()
