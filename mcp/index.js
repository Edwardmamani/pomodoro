#!/usr/bin/env node
/**
 * Entrypoint CLI MCP (stdio).
 * Uso: node mcp/index.js
 * Requiere que Electron haya creado la BD en userData, o usa POMODORO_DB_PATH.
 */
const path = require('path')
const fs = require('fs')
const os = require('os')
const Database = require('better-sqlite3')

const { ToolRegistry } = require('./registry/tool-registry')
const { McpProtocolAdapter } = require('./protocol/mcp-adapter')
const { startStdioTransport } = require('./transport/stdio')
const tasksList = require('./tools/tasks-list')
const tasksCreate = require('./tools/tasks-create')
const tasksUpdateDueDate = require('./tools/tasks-update-due-date')

function resolveDbPath() {
  if (process.env.POMODORO_DB_PATH) return process.env.POMODORO_DB_PATH
  const candidates = [
    path.join(os.homedir(), '.config', 'pomodoro-serene-focus', 'pomodoro.db'),
    path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'pomodoro-serene-focus',
      'pomodoro.db'
    ),
    path.join(
      process.env.APPDATA || '',
      'pomodoro-serene-focus',
      'pomodoro.db'
    )
  ]
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p
  }
  return candidates[0]
}

function createStandaloneTaskService(dbPath) {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

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
      tags: row.tags ? String(row.tags).split(',').filter(Boolean) : []
    }
  }

  return {
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
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      return db
        .prepare(
          `
        SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags
        FROM tasks t
        LEFT JOIN task_tags tt ON tt.task_id = t.id
        LEFT JOIN tags g ON g.id = tt.tag_id
        ${where}
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `
        )
        .all(params)
        .map(mapTask)
    },
    create(input) {
      const title = String(input.title || '').trim()
      if (!title) return { ok: false, error: 'TITLE_REQUIRED' }
      const now = new Date().toISOString()
      const id = db
        .prepare(
          `
        INSERT INTO tasks (
          title, status, priority, due_date, estimated_pomodoros,
          completed_pomodoros, accumulated_ms, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
      `
        )
        .run(
          title,
          input.status || 'todo',
          input.priority || 'medium',
          input.due_date || null,
          Number(input.estimated_pomodoros) || 0,
          now,
          now
        ).lastInsertRowid
      return {
        ok: true,
        data: mapTask(db.prepare('SELECT *, NULL AS tags FROM tasks WHERE id = ?').get(id))
      }
    },
    updateDueDate(id, dueDate) {
      const now = new Date().toISOString()
      const info = db
        .prepare('UPDATE tasks SET due_date = ?, updated_at = ? WHERE id = ?')
        .run(dueDate, now, id)
      if (info.changes === 0) return { ok: false, error: 'NOT_FOUND' }
      return {
        ok: true,
        data: mapTask(
          db.prepare('SELECT *, NULL AS tags FROM tasks WHERE id = ?').get(id)
        )
      }
    }
  }
}

function isMcpEnabled(dbPath) {
  if (!fs.existsSync(dbPath)) return false
  const db = new Database(dbPath, { readonly: true })
  try {
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('mcp_enabled')
    return row?.value === 'true'
  } finally {
    db.close()
  }
}

function main() {
  const dbPath = resolveDbPath()
  const registry = new ToolRegistry()
  const taskService = createStandaloneTaskService(dbPath)

  const wrap = (tool) => ({
    ...tool,
    handler: (args) => tool.handler(args, { taskService })
  })

  registry.register(wrap(tasksList))
  registry.register(wrap(tasksCreate))
  registry.register(wrap(tasksUpdateDueDate))

  const adapter = new McpProtocolAdapter({
    registry,
    isEnabled: () => isMcpEnabled(dbPath),
    deps: { taskService }
  })

  startStdioTransport(adapter)
}

if (require.main === module) {
  main()
}

module.exports = { main }
