const RoutineModel = require('../models/RoutineModel')
const { localDay, getDayOfWeek } = require('../lib/date')

class RoutineTaskService {
  constructor({ tasks, routines, notes }) {
    this.tasks = tasks
    this.routines = routines
    this.notes = notes
  }

  listRoutines(filters = {}) {
    const routines = this.routines.listActive()
    const todayTasks = this.tasks.list({ due: 'today' })
    const byRoutine = new Map(todayTasks.filter((t) => t.routine_id).map((t) => [t.routine_id, t]))

    let result = routines.map((r) => {
      const existing = byRoutine.get(r.id)
      if (existing) {
        return { ...existing, days_of_week: r.days_of_week, is_routine: true, is_active_today: true }
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
      result = result.filter((item) => (item.tags || []).some((t) => t.toLowerCase() === tag))
    }
    return result
  }

  enrichTasks(tasksList) {
    const routinesMap = new Map(this.routines.listActive().map((r) => [r.id, r]))
    return tasksList.map((t) => {
      const r = t.routine_id ? routinesMap.get(t.routine_id) : null
      return r ? { ...t, days_of_week: r.days_of_week, is_routine: true, is_active_today: true } : t
    })
  }

  createRoutineTask(title, input) {
    const tags = Array.isArray(input.tags) ? input.tags : []
    const routineId = this.routines.create({
      title, priority: input.priority, estimated: Number(input.estimated_pomodoros) || 0,
      impact: input.impact, urgency: input.urgency, effort: input.effort,
      dependencies: input.dependencies, risk: input.risk,
      daysOfWeek: input.days_of_week || [], tags
    })

    const today = localDay()
    let createdTask = null
    if (RoutineModel.matchesDay(input.days_of_week || [], getDayOfWeek(today))) {
      const taskId = this.tasks.create({
        title, status: input.status || 'todo', priority: input.priority, dueDate: today,
        estimated: Number(input.estimated_pomodoros) || 0, tags,
        impact: input.impact, urgency: input.urgency, effort: input.effort,
        dependencies: input.dependencies, risk: input.risk, routineId
      })
      createdTask = this.tasks.getById(taskId)
    }
    return { createdTask, routineId }
  }

  updateRoutine(routineId, input = {}) {
    const updated = this.routines.update(routineId, {
      title: input.title, priority: input.priority, estimated: input.estimated_pomodoros,
      impact: input.impact, urgency: input.urgency, effort: input.effort,
      dependencies: input.dependencies, risk: input.risk, daysOfWeek: input.days_of_week, tags: input.tags
    })
    this.tasks.syncDailyRoutines()

    const taskToday = this.tasks.db
      .prepare('SELECT id FROM tasks WHERE routine_id = ? AND due_date = ?')
      .get(routineId, localDay())
    if (taskToday) {
      this.tasks.update(taskToday.id, {
        title: input.title, priority: input.priority, estimated: input.estimated_pomodoros,
        impact: input.impact, urgency: input.urgency, effort: input.effort,
        dependencies: input.dependencies, risk: input.risk, tags: input.tags
      })
    }
    return updated
  }

  deleteRoutine(routineId) {
    this.routines.delete(routineId)
    try { this.notes.removeForRoutine(routineId) } catch { /* ignore */ }
  }
}

module.exports = RoutineTaskService
