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
        getPath: () => mockUserData
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

// 1. Verificar tareas creadas por seed
const tasks = taskModel.list()
if (tasks.length < 1) throw new Error('Seed no creó tareas')

// 2. Verificar cálculo de la fórmula de prioridad vectorial: P = ((I * U) + (D * R)) / E
const t1 = tasks[0]
if (typeof t1.priority_score !== 'number' || t1.priority_score <= 0) {
  throw new Error(`priority_score inválido en tarea seed: ${t1.priority_score}`)
}

const calculatedScore = TaskModel.calculatePriorityScore(5, 4, 2, 3, 4)
// (5*4 + 3*4)/2 = (20 + 12)/2 = 16.00
if (calculatedScore !== 16.00) {
  throw new Error(`Cálculo de score incorrecto: esperado 16.00, obtenido ${calculatedScore}`)
}

// 3. Crear nueva tarea con vector de 5 variables
const created = taskController.create(null, {
  title: 'Tarea con Vector de Prioridad',
  impact: 5,
  urgency: 5,
  effort: 1,
  dependencies: 5,
  risk: 5,
  tags: ['Prioritaria']
})
if (!created.ok) throw new Error('create falló')

// Con I=5, U=5, E=1, D=5, R=5 => P = (25 + 25) / 1 = 50.00
if (created.data.priority_score !== 50.00) {
  throw new Error(`priority_score esperado 50.00, obtenido ${created.data.priority_score}`)
}

// 4. Verificar que se ordena por prioridad descendente entre tareas pendientes
const todoTasks = taskModel.list({ status: 'todo' })
if (todoTasks[0].id !== created.data.id) {
  throw new Error(`La tarea con mayor puntaje debe ser la primera en 'todo': esperado ${created.data.id}, obtenido ${todoTasks[0].id}`)
}

// 4.1 Test de Urgencia Dinámica calculada por fecha de finalización
const { localDay, addDaysLocal } = require('../electron-main/lib/date')
const today = localDay()
const tomorrow = addDaysLocal(today, 1)
const in3Days = addDaysLocal(today, 3)
const in6Days = addDaysLocal(today, 6)
const in15Days = addDaysLocal(today, 15)

const taskToday = taskController.create(null, {
  title: 'Vence hoy',
  due_date: today,
  impact: 4,
  effort: 2,
  dependencies: 1,
  risk: 2
})
if (taskToday.data.urgency !== 5) {
  throw new Error(`Urgencia esperada 5 para vence hoy, obtenido: ${taskToday.data.urgency}`)
}

const taskTomorrow = taskController.create(null, {
  title: 'Vence mañana',
  due_date: tomorrow,
  impact: 4,
  effort: 2,
  dependencies: 1,
  risk: 2
})
if (taskTomorrow.data.urgency !== 4) {
  throw new Error(`Urgencia esperada 4 para vence mañana, obtenido: ${taskTomorrow.data.urgency}`)
}

const task3Days = taskController.create(null, {
  title: 'Vence en 3 días',
  due_date: in3Days,
  impact: 4,
  effort: 2,
  dependencies: 1,
  risk: 2
})
if (task3Days.data.urgency !== 3) {
  throw new Error(`Urgencia esperada 3 para vence en 3 días, obtenido: ${task3Days.data.urgency}`)
}

const task6Days = taskController.create(null, {
  title: 'Vence en 6 días',
  due_date: in6Days,
  impact: 4,
  effort: 2,
  dependencies: 1,
  risk: 2
})
if (task6Days.data.urgency !== 2) {
  throw new Error(`Urgencia esperada 2 para vence en 6 días, obtenido: ${task6Days.data.urgency}`)
}

const task15Days = taskController.create(null, {
  title: 'Vence en 15 días',
  due_date: in15Days,
  impact: 4,
  effort: 2,
  dependencies: 1,
  risk: 2
})
if (task15Days.data.urgency !== 1) {
  throw new Error(`Urgencia esperada 1 para vence en 15 días, obtenido: ${task15Days.data.urgency}`)
}

// Test de edición: Al cambiar fecha de finalización, se recalcula urgencia y score
const taskEdit = taskController.create(null, {
  title: 'Tarea para editar fecha',
  due_date: in15Days,
  impact: 4,
  effort: 2,
  dependencies: 1,
  risk: 2
})
if (taskEdit.data.urgency !== 1) throw new Error('Urgencia inicial debe ser 1')

const updatedTask = taskController.update(null, taskEdit.data.id, {
  due_date: today
})
if (updatedTask.data.urgency !== 5) {
  throw new Error(`Urgencia tras editar debe ser 5, obtenido: ${updatedTask.data.urgency}`)
}
if (updatedTask.data.priority_score !== 11.00) {
  throw new Error(`Score tras editar fecha esperado 11.00, obtenido: ${updatedTask.data.priority_score}`)
}

// 5. Activar tarea para el cronómetro
const active = taskController.setActive(null, created.data.id)
if (!active.ok) throw new Error('setActive falló')

const activeList = taskModel.list()
if (activeList[0].id !== created.data.id) {
  throw new Error('La tarea activa de mayor puntaje debe ser la primera de la lista')
}

// 6. Test Cronómetro: Start, Pause, Resume, Reset
async function testStopwatch() {
  timer.reset()
  const initial = timer.getState()
  if (initial.controlMode !== 'stopwatch') {
    throw new Error('El temporizador debe operar en modo cronómetro')
  }

  const startRes = timer.start(null)
  if (!startRes.ok) throw new Error('start falló')
  await new Promise((r) => setTimeout(r, 1200))

  const running = timer.getState()
  if (running.status !== 'running') {
    throw new Error('Cronómetro debería estar running')
  }
  if (running.elapsedMs < 1000) {
    throw new Error(`elapsedMs no avanzó: ${running.elapsedMs}`)
  }

  const pauseRes = timer.pause()
  if (!pauseRes.ok) throw new Error('pause falló')
  const paused = timer.getState()
  if (paused.status !== 'paused') {
    throw new Error('Cronómetro debería estar paused')
  }

  // Verificar que el tiempo se acumuló a la tarea activa
  const taskAfterPause = taskModel.getById(created.data.id)
  if (!taskAfterPause || taskAfterPause.accumulated_ms < 500) {
    throw new Error(`Tiempo acumulado no registrado en tarea: ${taskAfterPause && taskAfterPause.accumulated_ms}`)
  }

  timer.reset()
  const resetState = timer.getState()
  if (resetState.status !== 'idle') {
    throw new Error('Cronómetro debería estar idle tras reset')
  }
}

// 7. Test de Notas
async function testNotes() {
  const noteModel = new NoteModel()
  const content = '# Nota de prueba en Markdown\nContenido de prueba'
  const saved = await noteModel.write(created.data.id, content)
  if (!saved) throw new Error('noteModel.write falló')

  const loaded = await noteModel.read(created.data.id)
  if (!loaded || loaded.content !== content) {
    throw new Error('noteModel.read contenido distinto')
  }
}

async function main() {
  await testStopwatch()
  await testNotes()
  closeConnection()
  console.log('✅ Smoke tests pasaron exitosamente (Cronómetro + Priorización Vectorial + DB)')
}

main().catch((err) => {
  console.error('❌ Falló smoke test:', err)
  process.exit(1)
})
