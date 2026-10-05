const { EventEmitter } = require('events')
const { dialog, BrowserWindow } = require('electron')
const fs = require('fs')
const TaskModel = require('../models/TaskModel')
const SettingsModel = require('../models/SettingsModel')
const NoteModel = require('../models/NoteModel')

const CSV_HEADER =
  'id,title,status,priority,due_date,estimated_pomodoros,completed_pomodoros,accumulated_ms,tags'

function csvEscape(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

class TaskController {
  constructor() {
    this.tasks = new TaskModel()
    this.settings = new SettingsModel()
    this.notes = new NoteModel()
    this.bus = new EventEmitter()
  }

  list(_event, filters) {
    return { ok: true, data: this.tasks.list(filters || {}) }
  }

  listTags() {
    return { ok: true, data: this.tasks.listTags() }
  }

  create(_event, input) {
    input = input || {}
    const title = String(input.title || '').trim()
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }

    const id = this.tasks.create({
      title,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      dueDate: input.due_date || null,
      estimated: Number(input.estimated_pomodoros) || 0,
      tags: Array.isArray(input.tags) ? input.tags : []
    })
    this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  update(_event, id, input) {
    input = input || {}
    const existing = this.tasks.getById(id)
    if (!existing) return { ok: false, error: 'NOT_FOUND' }

    const title =
      input.title !== undefined ? String(input.title).trim() : existing.title
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }

    const status = input.status ?? existing.status
    this.tasks.update(id, {
      title,
      status,
      priority: input.priority ?? existing.priority,
      dueDate: input.due_date !== undefined ? input.due_date : existing.due_date,
      estimated:
        input.estimated_pomodoros !== undefined
          ? Number(input.estimated_pomodoros)
          : existing.estimated_pomodoros,
      tags: input.tags
    })

    if (status === 'in_progress') {
      this.settings.setMany({ active_task_id: id })
      this.notifyTimerActiveChanged(id)
    }

    if (status === 'done' && existing.status == 'in_progress') {
      const nextTask = this.tasks.getNextTask(id)
      if (nextTask) {
        this.tasks.activate(nextTask.id)
        this.settings.setMany({ active_task_id: nextTask.id })
        this.notifyTimerActiveChanged(nextTask.id)
      }
    }

    this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  setActive(_event, id) {
    const task = this.tasks.getById(id)
    if (!task) return { ok: false, error: 'NOT_FOUND' }
    if (task.status === 'cancelled') {
      return { ok: false, error: 'TASK_CANCELLED' }
    }

    this.tasks.activate(id, { keepStatus: task.status === 'done' })
    this.settings.setMany({ active_task_id: id })
    this.notifyTimerActiveChanged(id)
    this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  remove(_event, id) {
    if (this.tasks.remove(id) === 0) return { ok: false, error: 'NOT_FOUND' }

    if (this.settings.getAll().active_task_id === id) {
      this.settings.setMany({ active_task_id: '' })
      this.notifyTimerActiveChanged(null)
    }
    try {
      this.notes.removeForTask(id)
    } catch {
      /* la nota es auxiliar; no bloquear el borrado de la tarea */
    }
    this.emitChanged()
    return { ok: true }
  }

  async export(_event, format, filters) {
    const isCsv = format === 'csv'
    const tasks = this.tasks.list(filters || {})
    const win = BrowserWindow.getFocusedWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Exportar tareas',
      defaultPath: isCsv ? 'tareas.csv' : 'tareas.json',
      filters: isCsv
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || !filePath) {
      return { ok: false, error: 'CANCELLED' }
    }

    const content = isCsv
      ? [
          CSV_HEADER,
          ...tasks.map((t) =>
            [
              t.id,
              csvEscape(t.title),
              t.status,
              t.priority,
              t.due_date || '',
              t.estimated_pomodoros,
              t.completed_pomodoros,
              t.accumulated_ms,
              csvEscape((t.tags || []).join('|'))
            ].join(',')
          )
        ].join('\n')
      : JSON.stringify(tasks, null, 2)

    fs.writeFileSync(filePath, content, 'utf8')
    return { ok: true, data: { filePath, count: tasks.length } }
  }

  emitChanged() {
    this.bus.emit('changed')
  }

  onChanged(listener) {
    this.bus.on('changed', listener)
    return () => this.bus.off('changed', listener)
  }

  notifyTimerActiveChanged(taskId) {
    // require perezoso: TimerController importa este controlador al cargarse.
    require('./TimerController').onActiveTaskChanged(taskId)
  }
}

module.exports = new TaskController()
