#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const os = require('os')
const Database = require('better-sqlite3')

const { ToolRegistry } = require('./registry/tool-registry')
const { McpProtocolAdapter } = require('./protocol/mcp-adapter')
const { startStdioTransport } = require('./transport/stdio')
const StandaloneTaskService = require('./services/StandaloneTaskService')
const tasksList = require('./tools/tasks-list')
const tasksCreate = require('./tools/tasks-create')
const tasksUpdateDueDate = require('./tools/tasks-update-due-date')

class McpServerApp {
  resolveDbPath() {
    if (process.env.POMODORO_DB_PATH) return process.env.POMODORO_DB_PATH
    const candidates = [
      path.join(os.homedir(), '.config', 'pomodoro-serene-focus', 'pomodoro.db'),
      path.join(os.homedir(), 'Library', 'Application Support', 'pomodoro-serene-focus', 'pomodoro.db'),
      path.join(process.env.APPDATA || '', 'pomodoro-serene-focus', 'pomodoro.db')
    ]
    return candidates.find((p) => p && fs.existsSync(p)) || candidates[0]
  }

  isMcpEnabled(dbPath) {
    if (!fs.existsSync(dbPath)) return false
    const db = new Database(dbPath, { readonly: true })
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('mcp_enabled')
      return row?.value === 'true'
    } finally {
      db.close()
    }
  }

  start() {
    const dbPath = this.resolveDbPath()
    const registry = new ToolRegistry()
    const taskService = new StandaloneTaskService(dbPath)
    const wrap = (tool) => ({ ...tool, handler: (args) => tool.handler(args, { taskService }) })

    registry.register(wrap(tasksList))
    registry.register(wrap(tasksCreate))
    registry.register(wrap(tasksUpdateDueDate))

    const adapter = new McpProtocolAdapter({
      registry,
      isEnabled: () => this.isMcpEnabled(dbPath),
      deps: { taskService }
    })
    startStdioTransport(adapter)
  }
}

function main() {
  new McpServerApp().start()
}

if (require.main === module) main()

module.exports = { main, McpServerApp }
