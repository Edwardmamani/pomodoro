const { getConnection } = require('../db/connection')
const {
  localDay,
  addDaysLocal,
  calculateUrgencyFromDueDate
} = require('../lib/date')

const SELECT_WITH_TAGS = `
  SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags
  FROM tasks t
  LEFT JOIN task_tags tt ON tt.task_id = t.id
  LEFT JOIN tags g ON g.id = tt.tag_id
`

function calculatePriorityScore(impact, urgency, effort, dependencies, risk) {
  const i = Math.max(1, Math.min(5, Number(impact) || 3))
  const u = Math.max(1, Math.min(5, Number(urgency) || 3))
  const e = Math.max(1, Math.min(5, Number(effort) || 3))
  const d = Math.max(1, Math.min(5, Number(dependencies) || 1))
  const r = Math.max(1, Math.min(5, Number(risk) || 1))
  const score = ((i * u) + (d * r)) / e
  return Number(score.toFixed(2))
}

function derivePriorityLabel(score) {
  if (score >= 12) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

class TaskModel {
  constructor() {
    this.lastSyncDay = null
  }

  get db() {
    return getConnection()
  }

  static calculatePriorityScore(impact, urgency, effort, dependencies, risk) {
    return calculatePriorityScore(impact, urgency, effort, dependencies, risk)
  }

  static calculateUrgencyFromDueDate(dueDate, today) {
    return calculateUrgencyFromDueDate(dueDate, today)
  }

  needsDailySync() {
    return this.lastSyncDay !== localDay()
  }

  syncDailyUrgencies(force = false) {
    const today = localDay()
    if (!force && this.lastSyncDay === today) return

    const db = this.db
    const tableExists = db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tasks'"
      )
      .get()
    if (!tableExists) return

    this.lastSyncDay = today

    const openTasks = db
      .prepare(
        `SELECT id, due_date, impact, urgency, effort, dependencies, risk, priority_score
         FROM tasks
         WHERE status NOT IN ('done', 'cancelled') AND due_date IS NOT NULL`
      )
      .all()

    if (!openTasks.length) return

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET urgency = ?, priority_score = ?, updated_at = ?
      WHERE id = ?
    `)

    const now = new Date().toISOString()
    const tx = db.transaction(() => {
      for (const t of openTasks) {
        const newUrg = calculateUrgencyFromDueDate(t.due_date, today)
        const newScore = calculatePriorityScore(
          t.impact,
          newUrg,
          t.effort,
          t.dependencies,
          t.risk
        )
        if (newUrg !== t.urgency || newScore !== t.priority_score) {
          updateStmt.run(newUrg, newScore, now, t.id)
        }
      }
    })
    tx()
  }

  static map(row) {
    if (!row) return null
    const impact = row.impact != null ? Number(row.impact) : 3
    const urgency = row.urgency != null ? Number(row.urgency) : 3
    const effort = row.effort != null ? Number(row.effort) : 3
    const dependencies = row.dependencies != null ? Number(row.dependencies) : 1
    const risk = row.risk != null ? Number(row.risk) : 1
    const priorityScore =
      row.priority_score != null
        ? Number(row.priority_score)
        : calculatePriorityScore(impact, urgency, effort, dependencies, risk)

    return {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority || derivePriorityLabel(priorityScore),
      due_date: row.due_date,
      estimated_pomodoros: row.estimated_pomodoros,
      completed_pomodoros: row.completed_pomodoros,
      accumulated_ms: row.accumulated_ms,
      impact,
      urgency,
      effort,
      dependencies,
      risk,
      priority_score: priorityScore,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags
        ? String(row.tags)
            .split(',')
            .filter(Boolean)
        : []
    }
  }

  list(filters = {}) {
    this.syncDailyUrgencies()
    const clauses = []
    const params = {}

    if (filters.status) {
      clauses.push('t.status = @status')
      params.status = filters.status
    }
    if (filters.q) {
      clauses.push('t.title LIKE @q')
      params.q = `%${filters.q}%`
    }
    if (filters.priority) {
      clauses.push('t.priority = @priority')
      params.priority = filters.priority
    }
    if (filters.tag) {
      clauses.push(`EXISTS (
        SELECT 1 FROM task_tags tt2
        JOIN tags g2 ON g2.id = tt2.tag_id
        WHERE tt2.task_id = t.id AND g2.name = @tag COLLATE NOCASE
      )`)
      params.tag = String(filters.tag).trim()
    }

    const today = localDay()
    if (filters.due === 'overdue') {
      clauses.push(
        `t.due_date IS NOT NULL AND t.due_date < @today AND t.status NOT IN ('done', 'cancelled')`
      )
      params.today = today
    } else if (filters.due === 'today') {
      clauses.push('t.due_date = @today')
      params.today = today
    } else if (filters.due === 'upcoming') {
      clauses.push(
        `t.due_date IS NOT NULL AND t.due_date > @today AND t.due_date <= @until AND t.status NOT IN ('done', 'cancelled')`
      )
      params.today = today
      params.until = addDaysLocal(today, 2)
    } else if (filters.due === 'set') {
      clauses.push('t.due_date IS NOT NULL')
    } else if (filters.due === 'none') {
      clauses.push('t.due_date IS NULL')
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    return this.db
      .prepare(
        `
      ${SELECT_WITH_TAGS}
      ${where}
      GROUP BY t.id
      ORDER BY
        CASE t.status
          WHEN 'in_progress' THEN 0
          WHEN 'todo' THEN 1
          WHEN 'blocked' THEN 2
          WHEN 'done' THEN 3
          ELSE 4
        END,
        t.priority_score DESC,
        t.created_at DESC
    `
      )
      .all(params)
      .map(TaskModel.map)
  }

  getById(id) {
    this.syncDailyUrgencies()
    const row = this.db
      .prepare(`${SELECT_WITH_TAGS} WHERE t.id = ? GROUP BY t.id`)
      .get(id)
    return TaskModel.map(row)
  }

  listTags() {
    return this.db
      .prepare('SELECT name FROM tags ORDER BY name COLLATE NOCASE ASC')
      .all()
      .map((r) => r.name)
  }

  create({
    title,
    status,
    priority,
    dueDate,
    estimated,
    tags,
    impact = 3,
    urgency,
    effort = 3,
    dependencies = 1,
    risk = 1
  }) {
    const db = this.db
    const now = new Date().toISOString()
    const today = localDay()
    const cleanDueDate = dueDate ? String(dueDate).trim() : null
    const imp = Math.max(1, Math.min(5, Number(impact) || 3))
    const urg = cleanDueDate
      ? calculateUrgencyFromDueDate(cleanDueDate, today)
      : (urgency !== undefined ? Math.max(1, Math.min(5, Number(urgency) || 1)) : 1)
    const eff = Math.max(1, Math.min(5, Number(effort) || 3))
    const dep = Math.max(1, Math.min(5, Number(dependencies) || 1))
    const rsk = Math.max(1, Math.min(5, Number(risk) || 1))
    const score = calculatePriorityScore(imp, urg, eff, dep, rsk)
    const prio = priority || derivePriorityLabel(score)

    const tx = db.transaction(() => {
      const taskId = db
        .prepare(
          `
        INSERT INTO tasks (
          title, status, priority, due_date, estimated_pomodoros,
          completed_pomodoros, accumulated_ms, impact, urgency, effort,
          dependencies, risk, priority_score, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          title,
          status || 'todo',
          prio,
          cleanDueDate,
          Number(estimated) || 0,
          imp,
          urg,
          eff,
          dep,
          rsk,
          score,
          now,
          now
        ).lastInsertRowid
      this.linkTags(taskId, tags)
      return taskId
    })
    return tx()
  }

  update(
    id,
    {
      title,
      status,
      priority,
      dueDate,
      estimated,
      tags,
      impact,
      urgency,
      effort,
      dependencies,
      risk
    }
  ) {
    const db = this.db
    const existing = this.getById(id)
    if (!existing) return

    const now = new Date().toISOString()
    const today = localDay()
    const targetDueDate =
      dueDate !== undefined
        ? (dueDate ? String(dueDate).trim() : null)
        : existing.due_date

    const imp =
      impact !== undefined
        ? Math.max(1, Math.min(5, Number(impact) || 3))
        : existing.impact

    const urg = targetDueDate
      ? calculateUrgencyFromDueDate(targetDueDate, today)
      : (urgency !== undefined
          ? Math.max(1, Math.min(5, Number(urgency) || 1))
          : (existing.urgency || 1))

    const eff =
      effort !== undefined
        ? Math.max(1, Math.min(5, Number(effort) || 3))
        : existing.effort
    const dep =
      dependencies !== undefined
        ? Math.max(1, Math.min(5, Number(dependencies) || 1))
        : existing.dependencies
    const rsk =
      risk !== undefined
        ? Math.max(1, Math.min(5, Number(risk) || 1))
        : existing.risk

    const score = calculatePriorityScore(imp, urg, eff, dep, rsk)
    const prio = priority !== undefined ? priority : derivePriorityLabel(score)

    const tx = db.transaction(() => {
      if (status === 'in_progress') {
        this.demoteInProgress(id, now)
      }
      db.prepare(
        `
        UPDATE tasks SET
          title = ?, status = ?, priority = ?, due_date = ?,
          estimated_pomodoros = ?, impact = ?, urgency = ?, effort = ?,
          dependencies = ?, risk = ?, priority_score = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(
        title,
        status,
        prio,
        targetDueDate,
        estimated,
        imp,
        urg,
        eff,
        dep,
        rsk,
        score,
        now,
        id
      )

      if (Array.isArray(tags)) {
        db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id)
        this.linkTags(id, tags)
      }
    })
    tx()
  }

  /** Deja una sola tarea en curso; las tareas terminadas conservan su estado. */
  activate(id, { keepStatus = false } = {}) {
    const db = this.db
    const now = new Date().toISOString()
    const tx = db.transaction(() => {
      this.demoteInProgress(id, now)
      if (!keepStatus) {
        db.prepare(
          `UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ?`
        ).run(now, id)
      }
    })
    tx()
  }

  remove(id) {
    return this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes
  }

  demoteInProgress(exceptId, now) {
    this.db
      .prepare(
        `UPDATE tasks SET status = 'todo', updated_at = ? WHERE status = 'in_progress' AND id != ?`
      )
      .run(now, exceptId)
  }

  linkTags(taskId, tagNames = []) {
    const db = this.db
    const find = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
    const insert = db.prepare('INSERT INTO tags (name) VALUES (?)')
    const link = db.prepare(
      'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)'
    )
    for (const name of tagNames) {
      const trimmed = String(name).trim()
      if (!trimmed) continue
      const existing = find.get(trimmed)
      const tagId = existing ? existing.id : insert.run(trimmed).lastInsertRowid
      link.run(taskId, tagId)
    }
  }

  /** Siguiente pendiente: mayor puntaje de prioridad P y, en empate, la entrega más próxima. */
  getNextTask(exceptId) {
    return this.db
      .prepare(
        `SELECT id FROM tasks
         WHERE status = 'todo' AND id != ?
         ORDER BY
           priority_score DESC,
           due_date IS NULL,
           due_date ASC,
           created_at ASC
         LIMIT 1`
      )
      .get(exceptId)
  }
}

module.exports = TaskModel
