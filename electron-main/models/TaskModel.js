const { getConnection } = require('../db/connection')
const { localDay, addDaysLocal } = require('../lib/date')

const SELECT_WITH_TAGS = `
  SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags
  FROM tasks t
  LEFT JOIN task_tags tt ON tt.task_id = t.id
  LEFT JOIN tags g ON g.id = tt.tag_id
`

class TaskModel {
  get db() {
    return getConnection()
  }

  static map(row) {
    if (!row) return null
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
      estimated_pomodoros: row.estimated_pomodoros,
      completed_pomodoros: row.completed_pomodoros,
      accumulated_ms: row.accumulated_ms,
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
        CASE t.priority
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          ELSE 2
        END,
        t.created_at DESC
    `
      )
      .all(params)
      .map(TaskModel.map)
  }

  getById(id) {
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

  create({ title, status, priority, dueDate, estimated, tags }) {
    const db = this.db
    const now = new Date().toISOString()
    const tx = db.transaction(() => {
      const taskId = db
        .prepare(
          `
        INSERT INTO tasks (
          title, status, priority, due_date, estimated_pomodoros,
          completed_pomodoros, accumulated_ms, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
      `
        )
        .run(title, status, priority, dueDate, estimated, now, now)
        .lastInsertRowid
      this.linkTags(taskId, tags)
      return taskId
    })
    return tx()
  }

  update(id, { title, status, priority, dueDate, estimated, tags }) {
    const db = this.db
    const now = new Date().toISOString()
    const tx = db.transaction(() => {
      if (status === 'in_progress') {
        this.demoteInProgress(id, now)
      }
      db.prepare(
        `
        UPDATE tasks SET
          title = ?, status = ?, priority = ?, due_date = ?,
          estimated_pomodoros = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(title, status, priority, dueDate, estimated, now, id)

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
  /** Siguiente pendiente: mayor prioridad y, en empate, la entrega más próxima. */
  getNextTask(exceptId) {
    return this.db
      .prepare(
        `SELECT id FROM tasks
         WHERE status = 'todo' AND id != ?
         ORDER BY
           CASE priority
             WHEN 'high' THEN 0
             WHEN 'medium' THEN 1
             ELSE 2
           END,
           due_date IS NULL,
           due_date ASC,
           created_at ASC
         LIMIT 1`
      )
      .get(exceptId)
  }
}

module.exports = TaskModel
