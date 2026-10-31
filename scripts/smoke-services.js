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

// 8. Test de Tareas Rutinarias (Issue #2)
async function testRoutineTasks() {
  const { getDayOfWeek, formatDateLongSpanish } = require('../electron-main/lib/date')
  const RoutineModel = require('../electron-main/models/RoutineModel')
  const routineModel = new RoutineModel()

  const currentDayOfWeek = getDayOfWeek(today)

  // 8.1 Crear rutina activa que incluye hoy
  const routineRes = taskController.create(null, {
    title: 'Repaso Anki Diario',
    is_routine: true,
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    impact: 4,
    effort: 2,
    tags: ['Estudio', 'Rutina']
  })

  if (!routineRes.ok || !routineRes.routineId || !routineRes.data) {
    throw new Error('Creación de tarea rutinaria para hoy falló')
  }

  const routineTaskToday = routineRes.data
  if (routineTaskToday.routine_id !== routineRes.routineId) {
    throw new Error(`routine_id en tarea creada incorrecto: ${routineTaskToday.routine_id}`)
  }
  if (routineTaskToday.due_date !== today) {
    throw new Error(`due_date esperado ${today}, obtenido ${routineTaskToday.due_date}`)
  }

  // 8.2 Crear rutina para días que NO incluyen hoy -> no debe crearse tarea hoy
  const otherDay = (currentDayOfWeek % 7) + 1
  const futureRoutineRes = taskController.create(null, {
    title: 'Rutina día alterno',
    is_routine: true,
    days_of_week: [otherDay],
    impact: 3
  })

  if (!futureRoutineRes.ok || !futureRoutineRes.routineId) {
    throw new Error('Creación de plantilla de rutina futura falló')
  }
  if (futureRoutineRes.data !== null) {
    throw new Error('No debe crearse tarea para hoy si hoy no es uno de los días configurados')
  }

  // 8.3 Comprobar sincronización diaria (sin duplicar si ya existe)
  const countBeforeSync = taskModel.list({ routine_id: routineRes.routineId }).length
  taskModel.syncDailyRoutines(today)
  const countAfterSync = taskModel.list({ routine_id: routineRes.routineId }).length
  if (countBeforeSync !== countAfterSync || countAfterSync !== 1) {
    throw new Error(`syncDailyRoutines duplicó la tarea de hoy: esperado 1, obtenido ${countAfterSync}`)
  }

  // 8.4 Comprobar archivo .md compartido con encabezado automático
  const noteLoad = await notesController.load(null, routineTaskToday.id)
  if (!noteLoad.ok || !noteLoad.data.isRoutine) {
    throw new Error('notesController.load no reconoció tarea rutinaria')
  }

  const expectedHeader = `### ${formatDateLongSpanish(today)}`
  if (!noteLoad.data.content.includes(expectedHeader)) {
    throw new Error(`Contenido de nota no incluye encabezado esperado: "${expectedHeader}"`)
  }

  // Guardar notas para hoy
  const updatedNoteContent = noteLoad.data.content + '\n- Vocabulario repaso 20 palabras completado.'
  const noteSave = await notesController.save(null, routineTaskToday.id, updatedNoteContent)
  if (!noteSave.ok) throw new Error('Guardado de nota rutinaria falló')

  // Simular otra instancia de la misma rutina (ej. otro día) para verificar que comparten el mismo archivo
  const fakeAnotherDayTaskId = taskModel.create({
    title: 'Repaso Anki Diario',
    due_date: '2026-11-01',
    routineId: routineRes.routineId
  })
  const noteLoadAnotherDay = await notesController.load(null, fakeAnotherDayTaskId)
  if (!noteLoadAnotherDay.data.content.includes('Vocabulario repaso 20 palabras completado')) {
    throw new Error('Las instancias de la rutina no están compartiendo el mismo archivo note.md')
  }

  // 8.5 Actualización con scope: 'all'
  const updateAllRes = taskController.update(
    null,
    routineTaskToday.id,
    { title: 'Repaso Anki Pro' },
    { scope: 'all' }
  )
  if (!updateAllRes.ok) throw new Error('update con scope all falló')
  const routineInDb = routineModel.getById(routineRes.routineId)
  if (!routineInDb || routineInDb.title !== 'Repaso Anki Pro') {
    throw new Error('update con scope all no actualizó la plantilla en routines')
  }

  // 8.6 Eliminación con scope: 'all'
  const removeRes = taskController.remove(null, routineTaskToday.id, { scope: 'all' })
  if (!removeRes.ok) throw new Error('remove con scope all falló')
  const routineAfterDelete = routineModel.getById(routineRes.routineId)
  if (routineAfterDelete !== null) {
    throw new Error('remove con scope all no eliminó la rutina de la tabla routines')
  }
  const remainingTasks = taskModel.list({ routine_id: routineRes.routineId })
  if (remainingTasks.length !== 0) {
    throw new Error('remove con scope all no eliminó en cascada las tareas de la rutina')
  }

  // 8.7 Filtro de rutinas y actualización de días para rutinas no programadas hoy
  const anotherDay = currentDayOfWeek === 7 ? 1 : currentDayOfWeek + 1
  const notTodayRoutineRes = taskController.create(null, {
    title: 'Rutina en otro día',
    days_of_week: [anotherDay],
    is_routine: true
  })
  if (!notTodayRoutineRes.ok) throw new Error('Falló creación de rutina no programada hoy')

  // Listar con filtro { routine: true }
  const routineListRes = taskController.list(null, { routine: true })
  if (!routineListRes.ok) throw new Error('taskController.list con { routine: true } falló')
  const foundTemplate = routineListRes.data.find((r) => r.routine_id === notTodayRoutineRes.routineId)
  if (!foundTemplate) throw new Error('No se encontró la rutina plantilla en el filtro routine')
  if (!foundTemplate.is_routine_template || foundTemplate.is_active_today) {
    throw new Error('La rutina no programada para hoy debe tener is_routine_template=true y is_active_today=false')
  }

  // Actualizar días para incluir el día de hoy
  const updateRoutineDaysRes = taskController.updateRoutine(null, notTodayRoutineRes.routineId, {
    title: 'Rutina en otro día (ahora hoy)',
    days_of_week: [anotherDay, currentDayOfWeek]
  })
  if (!updateRoutineDaysRes.ok) throw new Error('updateRoutine falló')

  // Verificar que syncDailyRoutines instanció la tarea para hoy
  const routineListAfterRes = taskController.list(null, { routine: true })
  const updatedItem = routineListAfterRes.data.find((r) => r.routine_id === notTodayRoutineRes.routineId)
  if (!updatedItem || !updatedItem.is_active_today) {
    throw new Error('Tras agregar el día de hoy a la rutina, debe ser is_active_today=true')
  }

  // Eliminar la plantilla usando id virtual routine_<id>
  const removeTemplateRes = taskController.remove(null, `routine_${notTodayRoutineRes.routineId}`)
  if (!removeTemplateRes.ok) throw new Error('remove con id virtual routine_<id> falló')
  if (routineModel.getById(notTodayRoutineRes.routineId) !== null) {
    throw new Error('remove con id virtual routine_<id> no eliminó la rutina')
  }
}

async function main() {
  await testStopwatch()
  await testNotes()
  await testRoutineTasks()
  closeConnection()
  console.log('✅ Smoke tests pasaron exitosamente (Cronómetro + Priorización Vectorial + Rutinas + DB)')
}

main().catch((err) => {
  console.error('❌ Falló smoke test:', err)
  process.exit(1)
})
