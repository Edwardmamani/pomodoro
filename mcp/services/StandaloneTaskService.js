const Database = require('better-sqlite3')
const { calculateUrgencyFromDueDate } = require('../../electron-main/lib/date')
const PriorityCalculator = require('../../electron-main/lib/PriorityCalculator')

class StandaloneTaskService {
  constructor(dbPath) {
    this.db = new Database(dbPath)
    this.db.pragma('foreign_keys = ON')
  }

  static mapTask(row) {
    if (!row) return null
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
      impact: row.impact != null ? Number(row.impact) : 3,
      urgency: row.urgency != null ? Number(row.urgency) : 3,
      effort: row.effort != null ? Number(row.effort) : 3,
      dependencies: row.dependencies != null ? Number(row.dependencies) : 1,
      risk: row.risk != null ? Number(row.risk) : 1,
      priority_score: row.priority_score != null ? Number(row.priority_score) : 0,
      estimated_pomodoros: row.estimated_pomodoros,
      completed_pomodoros: row.completed_pomodoros,
      accumulated_ms: row.accumulated_ms,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags ? String(row.tags).split(',').filter(Boolean) : []
    }
  }

  list(filters = {}) {
    const clauses = []
    const params = {}
    if (filters.status) { clauses.push('t.status = @status'); params.status = filters.status }
    if (filters.q) { clauses.push('t.title LIKE @q'); params.q = `%${filters.q}%` }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    return this.db
      .prepare(`
        SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags FROM tasks t
        LEFT JOIN task_tags tt ON tt.task_id = t.id LEFT JOIN tags g ON g.id = tt.tag_id
        ${where} GROUP BY t.id ORDER BY t.priority_score DESC, t.created_at DESC
      `)
      .all(params)
      .map(StandaloneTaskService.mapTask)
  }

  create(input = {}) {
    const title = String(input.title || '').trim()
    if (!title) return { ok: false, error: 'TITLE_REQUIRED' }
    const now = new Date().toISOString()
    const dueDate = input.due_date ? String(input.due_date).trim() : null
    const urg = dueDate ? calculateUrgencyFromDueDate(dueDate) : (input.urgency ?? 1)
    const v = PriorityCalculator.normalizeVectors({ ...input, urgency: urg })

    const id = this.db.prepare(`
      INSERT INTO tasks (
        title, status, priority, due_date, estimated_pomodoros,
        completed_pomodoros, accumulated_ms, impact, urgency, effort,
        dependencies, risk, priority_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, input.status || 'todo', input.priority || 'medium', dueDate,
      Number(input.estimated_pomodoros) || 0, v.impact, v.urgency, v.effort,
      v.dependencies, v.risk, v.score, now, now
    ).lastInsertRowid

    return { ok: true, data: StandaloneTaskService.mapTask(this.db.prepare('SELECT *, NULL AS tags FROM tasks WHERE id = ?').get(id)) }
  }

  updateDueDate(id, dueDate) {
    const existing = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!existing) return { ok: false, error: 'NOT_FOUND' }
    const now = new Date().toISOString()
    const cleanDue = dueDate ? String(dueDate).trim() : null
    const newUrg = cleanDue ? calculateUrgencyFromDueDate(cleanDue) : 1
    const newScore = PriorityCalculator.calculateScore(
      existing.impact ?? 3, newUrg, existing.effort ?? 3, existing.dependencies ?? 1, existing.risk ?? 1
    )
    this.db.prepare('UPDATE tasks SET due_date = ?, urgency = ?, priority_score = ?, updated_at = ? WHERE id = ?')
      .run(cleanDue, newUrg, newScore, now, id)
    return { ok: true, data: StandaloneTaskService.mapTask(this.db.prepare('SELECT *, NULL AS tags FROM tasks WHERE id = ?').get(id)) }
  }
}

module.exports = StandaloneTaskService
