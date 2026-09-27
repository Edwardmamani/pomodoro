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

async function testPersistOnQuit() {
  timerService.start()
  await new Promise((r) => setTimeout(r, 1200))

  const beforeQuit = timerService.getState()
  if (beforeQuit.status !== 'running') {
    throw new Error('Timer debería estar running antes de persistForQuit')
  }

  timerService.persistForQuit()
  const paused = timerService.getState()
  if (paused.status !== 'paused') {
    throw new Error(`Tras quit debería estar paused, got ${paused.status}`)
  }
  if (paused.remainingMs >= beforeQuit.durationMs) {
    throw new Error('remainingMs no avanzó')
  }

  const taskRows = taskService.list()
  const task = taskRows.find((t) => t.id === created.data.id)
  if (!task || task.accumulated_ms < 500) {
    throw new Error(
      `Tiempo de tarea no flusheado: ${task && task.accumulated_ms}`
    )
  }

  const remainingSaved = paused.remainingMs
  const creditedSaved = paused.creditedMs
  timerService.init()
  const restored = timerService.getState()
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
  timerService.init()
  const idleAgain = timerService.getState()
  if (idleAgain.status !== 'idle') {
    throw new Error('Snapshot debería consumirse tras restaurar')
  }
}

async function testControlModeSwitch() {
  settingsService.setMany({ focus_minutes: 25 })
  timerService.reset()
  timerService.setMode('focus')

  const startRes = timerService.start()
  if (!startRes.ok) throw new Error('start falló en testControlModeSwitch')
  await new Promise((r) => setTimeout(r, 1100))

  const before = timerService.getState()
  if (before.controlMode !== 'pomodoro') {
    throw new Error('Debería estar en pomodoro')
  }
  const remainingBefore = before.remainingMs

  const toSw = timerService.setControlMode('stopwatch')
  if (!toSw.ok) throw new Error('setControlMode stopwatch falló')
  const sw = timerService.getState()
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
  const mid = timerService.getState()
  if (mid.elapsedMs < 500) {
    throw new Error('Cronómetro no avanzó el display de la tarea')
  }

  const focusBefore = mid.completedFocusToday
  const back = timerService.setControlMode('pomodoro')
  if (!back.ok) throw new Error('vuelta a pomodoro falló')
  const after = timerService.getState()
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
  settingsService.setMany({ focus_minutes: 0.05 }) // 3s
  timerService.reset()
  timerService.setMode('focus')
  timerService.start()
  await new Promise((r) => setTimeout(r, 200))
  const focusAtSwitch = timerService.getState().completedFocusToday
  timerService.setControlMode('stopwatch')
  await new Promise((r) => setTimeout(r, 3500))
  timerService.setControlMode('pomodoro')
  const afterSessions = timerService.getState()
  if (afterSessions.completedFocusToday < focusAtSwitch + 1) {
    throw new Error(
      `Cronómetro debería completar ≥1 focus: ${afterSessions.completedFocusToday} vs ${focusAtSwitch}`
    )
  }

  settingsService.setMany({ focus_minutes: 25 })
  timerService.reset()
}

function taskAccumulated(taskId) {
  const row = taskService.list().find((t) => t.id === taskId)
  return row ? Number(row.accumulated_ms) || 0 : 0
}

async function testNoDoubleCountOnModeSwitch() {
  settingsService.setMany({ focus_minutes: 25 })
  timerService.reset()
  timerService.setMode('focus')
  timerService.start()
  await new Promise((r) => setTimeout(r, 1500))

  const taskId = created.data.id

  // Entrar a cronómetro flushea el tramo de focus (~1.5s)
  timerService.setControlMode('stopwatch')
  const afterEnterSw = taskAccumulated(taskId)
  if (afterEnterSw < 500) {
    throw new Error(`Flush al entrar a cronómetro falló: ${afterEnterSw}`)
  }

  await new Promise((r) => setTimeout(r, 400))
  timerService.setControlMode('pomodoro')

  const afterBack = taskAccumulated(taskId)
  const stopwatchDelta = afterBack - afterEnterSw
  if (stopwatchDelta > 2000) {
    throw new Error(
      `Cronómetro acreditó de más: +${stopwatchDelta}ms (enter ${afterEnterSw}, back ${afterBack})`
    )
  }

  const st = timerService.getState()
  const elapsed = st.elapsedMs || 0
  const credited = st.creditedMs || 0
  if (Math.abs(elapsed - credited) > 50) {
    throw new Error(
      `Tras volver, creditedMs debe igualar elapsed para no re-sumar: elapsed=${elapsed} credited=${credited}`
    )
  }

  // Un flush posterior no debe re-acreditar el tramo ya contado
  timerService.persistForQuit()
  const afterPersist = taskAccumulated(taskId)
  if (afterPersist - afterBack > 100) {
    throw new Error(
      `persistForQuit re-acreditó tiempo ya contado: +${afterPersist - afterBack}ms`
    )
  }

  timerService.init()
  timerService.reset()
}

testPersistOnQuit()
  .then(() => testControlModeSwitch())
  .then(() => testNoDoubleCountOnModeSwitch())
  .then(async () => {
    const notesService = require('../electron-main/services/notes.service')
    const taskId = created.data.id
    const saveRes = await notesService.save(taskId, '# Nota smoke\n\nHola')
    if (!saveRes.ok) throw new Error('notes.save failed')
    const loadRes = await notesService.load(taskId)
    if (!loadRes.ok || loadRes.data.content !== '# Nota smoke\n\nHola') {
      throw new Error('notes.load mismatch')
    }
    if (!fs.existsSync(loadRes.data.filePath)) {
      throw new Error('note.md missing on disk')
    }
    notesService.removeForTask(taskId)
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
