const { EventEmitter } = require('events')
const { getConnection } = require('../db/connection')
const settingsService = require('./settings.service')

const bus = new EventEmitter()

function mapTask(row) {
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

function list(filters = {}) {
  const db = getConnection()
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

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `
    SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags
    FROM tasks t
    LEFT JOIN task_tags tt ON tt.task_id = t.id
    LEFT JOIN tags g ON g.id = tt.tag_id
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

  return rows.map(mapTask)
}

function getById(id) {
  const db = getConnection()
  const row = db
    .prepare(
      `
    SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags
    FROM tasks t
    LEFT JOIN task_tags tt ON tt.task_id = t.id
    LEFT JOIN tags g ON g.id = tt.tag_id
    WHERE t.id = ?
    GROUP BY t.id
  `
    )
    .get(id)
  return mapTask(row)
}

function ensureTags(db, tagNames = []) {
  const ids = []
  const find = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
  const insert = db.prepare('INSERT INTO tags (name) VALUES (?)')
  for (const name of tagNames) {
    const trimmed = String(name).trim()
    if (!trimmed) continue
    const existing = find.get(trimmed)
    if (existing) {
      ids.push(existing.id)
    } else {
      ids.push(insert.run(trimmed).lastInsertRowid)
    }
  }
  return ids
}

function create(input) {
  const db = getConnection()
  const now = new Date().toISOString()
  const title = String(input.title || '').trim()
  if (!title) {
    return { ok: false, error: 'TITLE_REQUIRED' }
  }

  const status = input.status || 'todo'
  const priority = input.priority || 'medium'
  const estimated = Number(input.estimated_pomodoros) || 0
  const dueDate = input.due_date || null
  const tags = Array.isArray(input.tags) ? input.tags : []

  const tx = db.transaction(() => {
    const result = db
      .prepare(
        `
      INSERT INTO tasks (
        title, status, priority, due_date, estimated_pomodoros,
        completed_pomodoros, accumulated_ms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
    `
      )
      .run(title, status, priority, dueDate, estimated, now, now)

    const taskId = result.lastInsertRowid
    const tagIds = ensureTags(db, tags)
    const link = db.prepare(
      'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)'
    )
    for (const tagId of tagIds) {
      link.run(taskId, tagId)
    }
    return taskId
  })

  const id = tx()
  emitChanged()
  return { ok: true, data: getById(id) }
}

function update(id, input) {
  const db = getConnection()
  const existing = getById(id)
  if (!existing) return { ok: false, error: 'NOT_FOUND' }

  const now = new Date().toISOString()
  const title =
    input.title !== undefined ? String(input.title).trim() : existing.title
  if (!title) return { ok: false, error: 'TITLE_REQUIRED' }

  const status = input.status ?? existing.status
  const priority = input.priority ?? existing.priority
  const dueDate =
    input.due_date !== undefined ? input.due_date : existing.due_date
  const estimated =
    input.estimated_pomodoros !== undefined
      ? Number(input.estimated_pomodoros)
      : existing.estimated_pomodoros

  const tx = db.transaction(() => {
    if (status === 'in_progress') {
      db.prepare(
        `UPDATE tasks SET status = 'todo', updated_at = ? WHERE status = 'in_progress' AND id != ?`
      ).run(now, id)
    }

    db.prepare(
      `
      UPDATE tasks SET
        title = ?, status = ?, priority = ?, due_date = ?,
        estimated_pomodoros = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(title, status, priority, dueDate, estimated, now, id)

    if (Array.isArray(input.tags)) {
      db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id)
      const tagIds = ensureTags(db, input.tags)
      const link = db.prepare(
        'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)'
      )
      for (const tagId of tagIds) {
        link.run(id, tagId)
      }
    }
  })

  tx()

  if (status === 'in_progress') {
    settingsService.setMany({ active_task_id: id })
  }

  emitChanged()
  return { ok: true, data: getById(id) }
}

function updateDueDate(id, dueDate) {
  return update(id, { due_date: dueDate })
}

function setActive(id) {
  const task = getById(id)
  if (!task) return { ok: false, error: 'NOT_FOUND' }
  if (task.status === 'cancelled') {
    return { ok: false, error: 'TASK_CANCELLED' }
  }

  const db = getConnection()
  const now = new Date().toISOString()
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE tasks SET status = 'todo', updated_at = ? WHERE status = 'in_progress' AND id != ?`
    ).run(now, id)
    if (task.status !== 'done') {
      db.prepare(
        `UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ?`
      ).run(now, id)
    }
  })
  tx()
  settingsService.setMany({ active_task_id: id })
  emitChanged()
  return { ok: true, data: getById(id) }
}

function remove(id) {
  const db = getConnection()
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  if (info.changes === 0) return { ok: false, error: 'NOT_FOUND' }
  const settings = settingsService.getAll()
  if (settings.active_task_id === id) {
    settingsService.setMany({ active_task_id: '' })
  }
  emitChanged()
  return { ok: true }
}

function emitChanged() {
  bus.emit('changed')
}

function onChanged(listener) {
  bus.on('changed', listener)
  return () => bus.off('changed', listener)
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateDueDate,
  setActive,
  remove,
  onChanged,
  emitChanged
}
