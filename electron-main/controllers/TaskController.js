const { EventEmitter } = require('events')
const { dialog, BrowserWindow } = require('electron')
const fs = require('fs')
const TaskModel = require('../models/TaskModel')
const SettingsModel = require('../models/SettingsModel')
const NoteModel = require('../models/NoteModel')
const RoutineModel = require('../models/RoutineModel')
const { localDay, getDayOfWeek } = require('../lib/date')

const CSV_HEADER =
  'id,title,status,priority,priority_score,impact,urgency,effort,dependencies,risk,due_date,accumulated_ms,tags'

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
    this.routines = new RoutineModel()
    this.settings = new SettingsModel()
    this.notes = new NoteModel()
    this.bus = new EventEmitter()

    // Sincronización de urgencias dinámicas y rutinas al iniciar
    this.tasks.syncDailyUrgencies()

    // Verificación periódica para recalcular urgencias y generar tareas rutinarias al cambiar de día
    this.dailySyncTimer = setInterval(() => {
      if (this.tasks.needsDailySync()) {
        this.tasks.syncDailyUrgencies()
        this.emitChanged()
      }
    }, 10 * 60 * 1000)
    if (this.dailySyncTimer && typeof this.dailySyncTimer.unref === 'function') {
      this.dailySyncTimer.unref()
    }
  }

  list(_event, filters) {
    filters = filters || {}
    if (filters.routine) {
      const routines = this.routines.listActive()
      const today = localDay()
      const todayTasks = this.tasks.list({ due: 'today' })
      const todayTasksByRoutine = new Map()
      for (const t of todayTasks) {
        if (t.routine_id) {
          todayTasksByRoutine.set(t.routine_id, t)
        }
      }

      let result = routines.map((r) => {
        const existingToday = todayTasksByRoutine.get(r.id)
        if (existingToday) {
          return {
            ...existingToday,
            days_of_week: r.days_of_week,
            is_routine: true,
            is_active_today: true
          }
        }
        return {
          id: `routine_${r.id}`,
          routine_id: r.id,
          title: r.title,
          status: 'todo',
          priority: r.priority,
          due_date: null,
          estimated_pomodoros: r.estimated_pomodoros,
          completed_pomodoros: 0,
          accumulated_ms: 0,
          impact: r.impact,
          urgency: r.urgency,
          effort: r.effort,
          dependencies: r.dependencies,
          risk: r.risk,
          priority_score: r.priority_score,
          days_of_week: r.days_of_week,
          is_routine: true,
          is_routine_template: true,
          is_active_today: false,
          created_at: r.created_at,
          updated_at: r.updated_at,
          tags: r.tags || []
        }
      })

      if (filters.q) {
        const q = String(filters.q).toLowerCase().trim()
        result = result.filter((item) => item.title.toLowerCase().includes(q))
      }
      if (filters.tag) {
        const tag = String(filters.tag).toLowerCase().trim()
        result = result.filter((item) =>
          (item.tags || []).some((t) => t.toLowerCase() === tag)
        )
      }
      return { ok: true, data: result }
    }

    const tasksList = this.tasks.list(filters)
    const routinesMap = new Map()
    for (const r of this.routines.listActive()) {
      routinesMap.set(r.id, r)
    }
    const enriched = tasksList.map((t) => {
      if (t.routine_id && routinesMap.has(t.routine_id)) {
        const r = routinesMap.get(t.routine_id)
        return {
          ...t,
          days_of_week: r.days_of_week,
          is_routine: true,
          is_active_today: true
        }
      }
      return t
    })

    return { ok: true, data: enriched }
  }

  listTags() {
    return { ok: true, data: this.tasks.listTags() }
  }

  create(_event, input) {
    input = input || {}
    const title = String(input.title || '').trim()
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }

    const isRoutine = Boolean(
      input.is_routine || (Array.isArray(input.days_of_week) && input.days_of_week.length > 0)
    )

    if (isRoutine) {
      const routineId = this.routines.create({
        title,
        priority: input.priority,
        estimated: Number(input.estimated_pomodoros) || 0,
        impact: input.impact,
        urgency: input.urgency,
        effort: input.effort,
        dependencies: input.dependencies,
        risk: input.risk,
        daysOfWeek: input.days_of_week || [],
        tags: Array.isArray(input.tags) ? input.tags : []
      })

      const today = localDay()
      const currentDayOfWeek = getDayOfWeek(today)
      const matchesToday = RoutineModel.matchesDay(
        input.days_of_week || [],
        currentDayOfWeek
      )

      let createdTask = null
      if (matchesToday) {
        const taskId = this.tasks.create({
          title,
          status: input.status || 'todo',
          priority: input.priority,
          dueDate: today,
          estimated: Number(input.estimated_pomodoros) || 0,
          tags: Array.isArray(input.tags) ? input.tags : [],
          impact: input.impact,
          urgency: input.urgency,
          effort: input.effort,
          dependencies: input.dependencies,
          risk: input.risk,
          routineId
        })
        createdTask = this.tasks.getById(taskId)
      }

      this.emitChanged()
      return { ok: true, data: createdTask, routineId }
    }

    const id = this.tasks.create({
      title,
      status: input.status || 'todo',
      priority: input.priority,
      dueDate: input.due_date || null,
      estimated: Number(input.estimated_pomodoros) || 0,
      tags: Array.isArray(input.tags) ? input.tags : [],
      impact: input.impact,
      urgency: input.urgency,
      effort: input.effort,
      dependencies: input.dependencies,
      risk: input.risk
    })
    this.emitChanged()
    return { ok: true, data: this.tasks.getById(id) }
  }

  update(_event, id, input, options = {}) {
    input = input || {}
    options = options || {}

    if (typeof id === 'string' && id.startsWith('routine_')) {
      const routineId = Number(id.replace('routine_', ''))
      return this.updateRoutine(_event, routineId, input)
    }

    const existing = this.tasks.getById(id)
    if (!existing) return { ok: false, error: 'NOT_FOUND' }

    const title =
      input.title !== undefined ? String(input.title).trim() : existing.title
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }

    const status = input.status ?? existing.status

    if (existing.routine_id && options.scope === 'all') {
      this.routines.update(existing.routine_id, {
        title,
        priority: input.priority,
        estimated: input.estimated_pomodoros,
        impact: input.impact,
        urgency: input.urgency,
        effort: input.effort,
        dependencies: input.dependencies,
        risk: input.risk,
        daysOfWeek: input.days_of_week,
        tags: input.tags
      })
      this.tasks.syncDailyRoutines()
    }

    this.tasks.update(id, {
      title,
      status,
      priority: input.priority,
      dueDate: input.due_date !== undefined ? input.due_date : existing.due_date,
      estimated:
        input.estimated_pomodoros !== undefined
          ? Number(input.estimated_pomodoros)
          : existing.estimated_pomodoros,
      tags: input.tags,
      impact: input.impact,
      urgency: input.urgency,
      effort: input.effort,
      dependencies: input.dependencies,
      risk: input.risk,
      routineId: existing.routine_id
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

  remove(_event, id, options = {}) {
    options = options || {}

    if (typeof id === 'string' && id.startsWith('routine_')) {
      const routineId = Number(id.replace('routine_', ''))
      this.routines.delete(routineId)
      try {
        this.notes.removeForRoutine(routineId)
      } catch {
        /* ignore */
      }
      this.emitChanged()
      return { ok: true }
    }

    const existing = this.tasks.getById(id)
    if (!existing) return { ok: false, error: 'NOT_FOUND' }

    if (existing.routine_id && options.scope === 'all') {
      const routineId = existing.routine_id
      this.routines.delete(routineId)
      try {
        this.notes.removeForRoutine(routineId)
      } catch {
        /* la nota es auxiliar */
      }
    } else {
      if (this.tasks.remove(id) === 0) return { ok: false, error: 'NOT_FOUND' }
      try {
        if (!existing.routine_id) {
          this.notes.removeForTask(id)
        }
      } catch {
        /* la nota es auxiliar */
      }
    }

    if (this.settings.getAll().active_task_id === id) {
      this.settings.setMany({ active_task_id: '' })
      this.notifyTimerActiveChanged(null)
    }
    this.emitChanged()
    return { ok: true }
  }

  updateRoutine(_event, routineId, input) {
    if (!routineId) return { ok: false, error: 'INVALID_ID' }
    input = input || {}
    const updated = this.routines.update(routineId, {
      title: input.title,
      priority: input.priority,
      estimated: input.estimated_pomodoros,
      impact: input.impact,
      urgency: input.urgency,
      effort: input.effort,
      dependencies: input.dependencies,
      risk: input.risk,
      daysOfWeek: input.days_of_week,
      tags: input.tags
    })

    this.tasks.syncDailyRoutines()

    const today = localDay()
    const taskToday = this.tasks.db
      .prepare('SELECT id FROM tasks WHERE routine_id = ? AND due_date = ?')
      .get(routineId, today)
    if (taskToday) {
      this.tasks.update(taskToday.id, {
        title: input.title,
        priority: input.priority,
        estimated: input.estimated_pomodoros,
        impact: input.impact,
        urgency: input.urgency,
        effort: input.effort,
        dependencies: input.dependencies,
        risk: input.risk,
        tags: input.tags
      })
    }

    this.emitChanged()
    return { ok: true, data: updated }
  }

  getRoutine(_event, routineId) {
    if (!routineId) return { ok: false, error: 'INVALID_ID' }
    return { ok: true, data: this.routines.getById(routineId) }
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
              t.priority_score,
              t.impact,
              t.urgency,
              t.effort,
              t.dependencies,
              t.risk,
              t.due_date || '',
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
