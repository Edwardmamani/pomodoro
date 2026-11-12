const { EventEmitter } = require('events')
const TaskModel = require('../models/TaskModel')
const SettingsModel = require('../models/SettingsModel')
const NoteModel = require('../models/NoteModel')
const RoutineModel = require('../models/RoutineModel')
const RoutineTaskService = require('../services/RoutineTaskService')
const TaskExportService = require('../services/TaskExportService')

class TaskController {
  constructor() {
    this.tasks = new TaskModel()
    this.routines = new RoutineModel()
    this.settings = new SettingsModel()
    this.notes = new NoteModel()
    this.routineService = new RoutineTaskService({ tasks: this.tasks, routines: this.routines, notes: this.notes })
    this.exporter = new TaskExportService()
    this.bus = new EventEmitter()
    this.tasks.syncDailyUrgencies()
    this.dailySyncTimer = setInterval(() => {
      if (this.tasks.needsDailySync()) { this.tasks.syncDailyUrgencies(); this.emitChanged() }
    }, 10 * 60 * 1000)
    this.dailySyncTimer?.unref?.()
  }

  list(_event, filters = {}) {
    if (filters.routine) return { ok: true, data: this.routineService.listRoutines(filters) }
    return { ok: true, data: this.routineService.enrichTasks(this.tasks.list(filters)) }
  }

  listTags() { return { ok: true, data: this.tasks.listTags() } }

  create(_event, input = {}) {
    const title = String(input.title || '').trim()
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }
    if (input.is_routine || (Array.isArray(input.days_of_week) && input.days_of_week.length > 0)) {
      const { createdTask, routineId } = this.routineService.createRoutineTask(title, input)
      this.emitChanged()
      return { ok: true, data: createdTask, routineId }
    }
    const id = this.tasks.create({
      title, status: input.status || 'todo', priority: input.priority, dueDate: input.due_date || null,
      estimated: Number(input.estimated_pomodoros) || 0, tags: Array.isArray(input.tags) ? input.tags : [],
      impact: input.impact, urgency: input.urgency, effort: input.effort, dependencies: input.dependencies, risk: input.risk
    })
    this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  update(_event, id, input = {}, options = {}) {
    if (typeof id === 'string' && id.startsWith('routine_')) {
      return this.updateRoutine(_event, Number(id.replace('routine_', '')), input)
    }
    const existing = this.tasks.getById(id)
    if (!existing) return { ok: false, error: 'NOT_FOUND' }
    const title = input.title !== undefined ? String(input.title).trim() : existing.title
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }
    const status = input.status ?? existing.status
    if (existing.routine_id && options.scope === 'all') {
      this.routines.update(existing.routine_id, { ...input, title, estimated: input.estimated_pomodoros, daysOfWeek: input.days_of_week })
      this.tasks.syncDailyRoutines()
    }
    this.tasks.update(id, {
      title, status, priority: input.priority, dueDate: input.due_date !== undefined ? input.due_date : existing.due_date,
      estimated: input.estimated_pomodoros !== undefined ? Number(input.estimated_pomodoros) : existing.estimated_pomodoros,
      tags: input.tags, impact: input.impact, urgency: input.urgency, effort: input.effort,
      dependencies: input.dependencies, risk: input.risk, routineId: existing.routine_id
    })
    if (status === 'in_progress') {
      this.settings.setMany({ active_task_id: id }); this.notifyTimerActiveChanged(id)
    } else if (status === 'done' && existing.status === 'in_progress') {
      const next = this.tasks.getNextTask(id)
      if (next) { this.tasks.activate(next.id); this.settings.setMany({ active_task_id: next.id }); this.notifyTimerActiveChanged(next.id) }
    }
    this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  setActive(_event, id) {
    const task = this.tasks.getById(id)
    if (!task) return { ok: false, error: 'NOT_FOUND' }
    if (task.status === 'cancelled') return { ok: false, error: 'TASK_CANCELLED' }
    this.tasks.activate(id, { keepStatus: task.status === 'done' })
    this.settings.setMany({ active_task_id: id })
    this.notifyTimerActiveChanged(id); this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  remove(_event, id, options = {}) {
    if (typeof id === 'string' && id.startsWith('routine_')) {
      this.routineService.deleteRoutine(Number(id.replace('routine_', '')))
      this.emitChanged(); return { ok: true }
    }
    const existing = this.tasks.getById(id)
    if (!existing) return { ok: false, error: 'NOT_FOUND' }
    if (existing.routine_id && options.scope === 'all') {
      this.routineService.deleteRoutine(existing.routine_id)
    } else {
      if (this.tasks.remove(id) === 0) return { ok: false, error: 'NOT_FOUND' }
      try { if (!existing.routine_id) this.notes.removeForTask(id) } catch { /* ignore */ }
    }
    if (this.settings.getAll().active_task_id === id) {
      this.settings.setMany({ active_task_id: '' }); this.notifyTimerActiveChanged(null)
    }
    this.emitChanged(); return { ok: true }
  }

  updateRoutine(_event, routineId, input = {}) {
    if (!routineId) return { ok: false, error: 'INVALID_ID' }
    const updated = this.routineService.updateRoutine(routineId, input)
    this.emitChanged(); return { ok: true, data: updated }
  }
  getRoutine(_event, routineId) {
    return routineId ? { ok: true, data: this.routines.getById(routineId) } : { ok: false, error: 'INVALID_ID' }
  }
  async export(_event, format, filters) { return this.exporter.exportTasks(this.tasks.list(filters || {}), format) }
  emitChanged() { this.bus.emit('changed') }
  onChanged(listener) { this.bus.on('changed', listener); return () => this.bus.off('changed', listener) }
  notifyTimerActiveChanged(taskId) { require('./TimerController').onActiveTaskChanged(taskId) }
}
module.exports = new TaskController()
