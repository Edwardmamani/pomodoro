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
const timer = require('../electron-main/controllers/TimerController')
const taskController = require('../electron-main/controllers/TaskController')
const streakController = require('../electron-main/controllers/StreakController')
const notesController = require('../electron-main/controllers/NotesController')
const TaskModel = require('../electron-main/models/TaskModel')
const SettingsModel = require('../electron-main/models/SettingsModel')
const NoteModel = require('../electron-main/models/NoteModel')

const taskModel = new TaskModel()
const settingsModel = new SettingsModel()

runMigrations()
runSeed()
timer.init()

const tasks = taskModel.list()
if (tasks.length < 1) throw new Error('Seed no creó tareas')

const settings = settingsModel.getAll()
if (settings.focus_minutes !== 25) throw new Error('Settings default incorrecto')

settingsModel.setMany({ focus_minutes: 30 })
timer.syncDurationsFromSettings()
const state = timer.getState()
if (state.durationMs !== 30 * 60 * 1000) {
  throw new Error(`Timer no sincronizó: ${state.durationMs}`)
}

const created = taskController.create(null, {
  title: 'Smoke task',
  priority: 'low',
  tags: ['Test']
})
if (!created.ok) throw new Error('create falló')

const active = taskController.setActive(null, created.data.id)
if (!active.ok) throw new Error('setActive falló')

settingsModel.setMany({ focus_minutes: 25 })
timer.reset()

const streak = streakController.getStreak()
if (typeof streak.days !== 'number') throw new Error('streak inválido')

async function testPersistOnQuit() {
  timer.start(null)
  await new Promise((r) => setTimeout(r, 1200))

  const beforeQuit = timer.getState()
  if (beforeQuit.status !== 'running') {
    throw new Error('Timer debería estar running antes de persistForQuit')
  }

  timer.persistForQuit()
  const paused = timer.getState()
  if (paused.status !== 'paused') {
    throw new Error(`Tras quit debería estar paused, got ${paused.status}`)
  }
  if (paused.remainingMs >= beforeQuit.durationMs) {
    throw new Error('remainingMs no avanzó')
  }

  const taskRows = taskModel.list()
  const task = taskRows.find((t) => t.id === created.data.id)
  if (!task || task.accumulated_ms < 500) {
    throw new Error(
      `Tiempo de tarea no flusheado: ${task && task.accumulated_ms}`
    )
  }

  const remainingSaved = paused.remainingMs
  const creditedSaved = paused.creditedMs
  timer.init()
  const restored = timer.getState()
  if (restored.status !== 'paused') {
    throw new Error(`Tras init debería restaurar paused, got ${restored.status}`)
  }
  if (Math.abs(restored.remainingMs - remainingSaved) > 5) {
    throw new Error(
      `remainingMs restaurado distinto: ${restored.remainingMs} vs ${remainingSaved}`
    )
  }
  if (restored.bindingTaskId !== created.data.id) {
    throw new Error('bindingTaskId no restaurado')
  }
  if (Math.abs(restored.creditedMs - creditedSaved) > 5) {
    throw new Error('creditedMs no restaurado')
  }

  // Segunda init sin snapshot no debe re-aplicar estado pausado
  timer.init()
  const idleAgain = timer.getState()
  if (idleAgain.status !== 'idle') {
    throw new Error('Snapshot debería consumirse tras restaurar')
  }
}

async function testControlModeSwitch() {
  settingsModel.setMany({ focus_minutes: 25 })
  timer.reset()
  timer.setMode(null, 'focus')

  const startRes = timer.start(null)
  if (!startRes.ok) throw new Error('start falló en testControlModeSwitch')
  await new Promise((r) => setTimeout(r, 1100))

  const before = timer.getState()
  if (before.controlMode !== 'pomodoro') {
    throw new Error('Debería estar en pomodoro')
  }
  const remainingBefore = before.remainingMs

  const toSw = timer.setControlMode(null, 'stopwatch')
  if (!toSw.ok) throw new Error('setControlMode stopwatch falló')
  const sw = timer.getState()
  if (sw.controlMode !== 'stopwatch') {
    throw new Error('No cambió a stopwatch')
  }
  if (sw.status !== 'running') {
    throw new Error('Cronómetro debería seguir running')
  }
  // Display cuenta desde tiempo dedicado a la tarea (>= tiempo ya flusheado)
  if (typeof sw.display !== 'string' || !sw.display.includes(':')) {
    throw new Error(`Display cronómetro inválido: ${sw.display}`)
  }

  await new Promise((r) => setTimeout(r, 1100))
  const mid = timer.getState()
  if (mid.elapsedMs < 500) {
    throw new Error('Cronómetro no avanzó el display de la tarea')
  }

  const focusBefore = mid.completedFocusToday
  const back = timer.setControlMode(null, 'pomodoro')
  if (!back.ok) throw new Error('vuelta a pomodoro falló')
  const after = timer.getState()
  if (after.controlMode !== 'pomodoro') {
    throw new Error('No volvió a pomodoro')
  }
  // remaining = remainingBefore - workInStopwatch ≈ remainingBefore - 1100ms (más el 1er segundo ya no está en remaining del pomodoro al cambiar)
  // Al entrar a stopwatch se congeló remainingBefore; luego ~1.1s de work
  if (after.remainingMs > remainingBefore) {
    throw new Error(
      `remaining debería bajar o igualar tras cronómetro: ${after.remainingMs} > ${remainingBefore}`
    )
  }
  if (after.remainingMs > remainingBefore - 500) {
    throw new Error(
      `remaining no restó el tiempo de cronómetro: ${after.remainingMs} vs ${remainingBefore}`
    )
  }
  if (after.completedFocusToday < focusBefore) {
    throw new Error('completedFocusToday no debería bajar')
  }

  // Caso sesiones: focus muy corto para completar ≥1 sesión en cronómetro
  settingsModel.setMany({ focus_minutes: 0.05 }) // 3s
  timer.reset()
  timer.setMode(null, 'focus')
  timer.start(null)
  await new Promise((r) => setTimeout(r, 200))
  const focusAtSwitch = timer.getState().completedFocusToday
  timer.setControlMode(null, 'stopwatch')
  await new Promise((r) => setTimeout(r, 3500))
  timer.setControlMode(null, 'pomodoro')
  const afterSessions = timer.getState()
  if (afterSessions.completedFocusToday < focusAtSwitch + 1) {
    throw new Error(
      `Cronómetro debería completar ≥1 focus: ${afterSessions.completedFocusToday} vs ${focusAtSwitch}`
    )
  }

  settingsModel.setMany({ focus_minutes: 25 })
  timer.reset()
}

function taskAccumulated(taskId) {
  const row = taskModel.list().find((t) => t.id === taskId)
  return row ? Number(row.accumulated_ms) || 0 : 0
}

async function testNoDoubleCountOnModeSwitch() {
  settingsModel.setMany({ focus_minutes: 25 })
  timer.reset()
  timer.setMode(null, 'focus')
  timer.start(null)
  await new Promise((r) => setTimeout(r, 1500))

  const taskId = created.data.id

  // Entrar a cronómetro flushea el tramo de focus (~1.5s)
  timer.setControlMode(null, 'stopwatch')
  const afterEnterSw = taskAccumulated(taskId)
  if (afterEnterSw < 500) {
    throw new Error(`Flush al entrar a cronómetro falló: ${afterEnterSw}`)
  }

  await new Promise((r) => setTimeout(r, 400))
  timer.setControlMode(null, 'pomodoro')

  const afterBack = taskAccumulated(taskId)
  const stopwatchDelta = afterBack - afterEnterSw
  if (stopwatchDelta > 2000) {
    throw new Error(
      `Cronómetro acreditó de más: +${stopwatchDelta}ms (enter ${afterEnterSw}, back ${afterBack})`
    )
  }

  const st = timer.getState()
  const elapsed = st.elapsedMs || 0
  const credited = st.creditedMs || 0
  if (Math.abs(elapsed - credited) > 50) {
    throw new Error(
      `Tras volver, creditedMs debe igualar elapsed para no re-sumar: elapsed=${elapsed} credited=${credited}`
    )
  }

  // Un flush posterior no debe re-acreditar el tramo ya contado
  timer.persistForQuit()
  const afterPersist = taskAccumulated(taskId)
  if (afterPersist - afterBack > 100) {
    throw new Error(
      `persistForQuit re-acreditó tiempo ya contado: +${afterPersist - afterBack}ms`
    )
  }

  timer.init()
  timer.reset()
}

testPersistOnQuit()
  .then(() => testControlModeSwitch())
  .then(() => testNoDoubleCountOnModeSwitch())
  .then(async () => {
    const taskId = created.data.id
    const saveRes = await notesController.save(null, taskId, '# Nota smoke\n\nHola')
    if (!saveRes.ok) throw new Error('notes.save failed')
    const loadRes = await notesController.load(null, taskId)
    if (!loadRes.ok || loadRes.data.content !== '# Nota smoke\n\nHola') {
      throw new Error('notes.load mismatch')
    }
    if (!fs.existsSync(loadRes.data.filePath)) {
      throw new Error('note.md missing on disk')
    }
    new NoteModel().removeForTask(taskId)
    if (fs.existsSync(path.dirname(loadRes.data.filePath))) {
      throw new Error('task note dir not removed')
    }
  })
  .then(() => {
    closeConnection()
    console.log('SMOKE_OK', {
      tasks: tasks.length,
      created: created.data.id,
      streak: streak.days,
      db: dbFile
    })
  })
  .catch((err) => {
    console.error(err)
    try {
      closeConnection()
    } catch {
      /* ignore */
    }
    process.exit(1)
  })
