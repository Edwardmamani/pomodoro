/**
 * Smoke test de servicios (sin UI).
 * Ejecutar: ELECTRON_RUN_AS_NODE=1 electron scripts/smoke-services.js
 */
const path = require('path')
const fs = require('fs')
const os = require('os')

// Simular Electron app antes de cargar módulos que la usan
const mockUserData = path.join(os.tmpdir(), 'pomodoro-smoke-test')
fs.mkdirSync(mockUserData, { recursive: true })
const dbFile = path.join(mockUserData, 'pomodoro.db')
if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)

const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'electron') {
    return {
      app: {
        getPath: (name) => (name === 'userData' ? mockUserData : mockUserData)
      },
      BrowserWindow: {
        getAllWindows: () => [],
        getFocusedWindow: () => null
      },
      Notification: Object.assign(
        function Notification() {
          return { show() {} }
        },
        { isSupported: () => false }
      ),
      shell: { openExternal: async () => {} },
      dialog: { showSaveDialog: async () => ({ canceled: true }) },
      ipcMain: { handle() {} }
    }
  }
  return originalRequire.apply(this, arguments)
}

const { runMigrations } = require('../electron-main/db/migrations')
const { runSeed } = require('../electron-main/db/seed')
const { closeConnection } = require('../electron-main/db/connection')
const timerService = require('../electron-main/services/timer.service')
const taskService = require('../electron-main/services/task.service')
const settingsService = require('../electron-main/services/settings.service')
const streakService = require('../electron-main/services/streak.service')

runMigrations()
runSeed()
timerService.init()

const tasks = taskService.list()
if (tasks.length < 1) throw new Error('Seed no creó tareas')

const settings = settingsService.getAll()
if (settings.focus_minutes !== 25) throw new Error('Settings default incorrecto')

settingsService.setMany({ focus_minutes: 30 })
timerService.syncDurationsFromSettings()
const state = timerService.getState()
if (state.durationMs !== 30 * 60 * 1000) {
  throw new Error(`Timer no sincronizó: ${state.durationMs}`)
}

const created = taskService.create({
  title: 'Smoke task',
  priority: 'low',
  tags: ['Test']
})
if (!created.ok) throw new Error('create falló')

const active = taskService.setActive(created.data.id)
if (!active.ok) throw new Error('setActive falló')

settingsService.setMany({ focus_minutes: 25 })
timerService.reset()

const streak = streakService.getStreak()
if (typeof streak.days !== 'number') throw new Error('streak inválido')

closeConnection()
console.log('SMOKE_OK', {
  tasks: taskService.list ? tasks.length : 0,
  created: created.data.id,
  streak: streak.days,
  db: dbFile
})
