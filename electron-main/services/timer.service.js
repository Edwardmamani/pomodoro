const { BrowserWindow } = require('electron')
const { getConnection } = require('../db/connection')
const settingsService = require('./settings.service')
const taskService = require('./task.service')
const streakService = require('./streak.service')
const notificationService = require('./notification.service')

const CIRCUMFERENCE = 2 * Math.PI * 138
const SNAPSHOT_KEY = 'timer_snapshot'

let state = {
  status: 'idle',
  /** 'pomodoro' | 'stopwatch' */
  controlMode: 'pomodoro',
  periodType: 'focus',
  remainingMs: 25 * 60 * 1000,
  durationMs: 25 * 60 * 1000,
  endsAt: null,
  startedAt: null,
  /** Tarea a la que se atribuye el tramo actual de focus. */
  bindingTaskId: null,
  /** Ms ya persistidos en accumulated_ms durante este periodo (tras cambios de tarea). */
  creditedMs: 0,
  sessionInCycle: 0,
  completedFocusToday: 0,
  completedShortBreakToday: 0,
  completedLongBreakToday: 0,
  /** Ms de trabajo acumulados en cronómetro (solo running; se congela al pausar). */
  stopwatchWorkMs: 0,
  /** Timestamp Date.now() desde el que el cronómetro está corriendo. */
  stopwatchRunningSince: null,
  /** Ms de stopwatchWorkMs ya acreditados a la tarea. */
  stopwatchCreditedMs: 0,
  /** Base de display cuando no hay tarea (elapsed de focus al entrar). */
  stopwatchDisplayOffsetMs: 0,
  /** remainingMs del pomodoro al entrar en cronómetro. */
  savedPomodoroRemainingMs: null,
  /** durationMs del pomodoro al entrar en cronómetro. */
  savedPomodoroDurationMs: null,
  /** periodType al entrar en cronómetro. */
  savedPomodoroPeriodType: null
}

let tickTimer = null

function broadcast() {
  const payload = getState()
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('pomodoro:timer:state', payload)
  }
}

function durationFor(periodType) {
  const s = settingsService.getAll()
  if (periodType === 'short_break') return s.short_break_minutes * 60 * 1000
  if (periodType === 'long_break') return s.long_break_minutes * 60 * 1000
  return s.focus_minutes * 60 * 1000
}

function currentRemainingMs() {
  if (state.controlMode === 'stopwatch') {
    return state.remainingMs
  }
  if (state.status === 'running' && state.endsAt) {
    return Math.max(0, state.endsAt - Date.now())
  }
  return state.remainingMs
}

function currentElapsedMs() {
  if (state.status !== 'running' && state.status !== 'paused') return 0
  if (state.controlMode === 'stopwatch') {
    return currentStopwatchWorkMs()
  }
  return Math.max(0, state.durationMs - currentRemainingMs())
}

function currentStopwatchWorkMs() {
  let ms = state.stopwatchWorkMs
  if (
    state.controlMode === 'stopwatch' &&
    state.status === 'running' &&
    state.stopwatchRunningSince
  ) {
    ms += Math.max(0, Date.now() - state.stopwatchRunningSince)
  }
  return Math.max(0, ms)
}

function freezeStopwatchWork() {
  if (
    state.controlMode === 'stopwatch' &&
    state.status === 'running' &&
    state.stopwatchRunningSince
  ) {
    state.stopwatchWorkMs += Math.max(0, Date.now() - state.stopwatchRunningSince)
    state.stopwatchRunningSince = null
  }
}

function clearAttribution() {
  state.bindingTaskId = null
  state.creditedMs = 0
}

function clearStopwatchFields() {
  state.stopwatchWorkMs = 0
  state.stopwatchRunningSince = null
  state.stopwatchCreditedMs = 0
  state.stopwatchDisplayOffsetMs = 0
  state.savedPomodoroRemainingMs = null
  state.savedPomodoroDurationMs = null
  state.savedPomodoroPeriodType = null
}

function addAccumulatedMs(taskId, ms, atIso) {
  if (!taskId || ms <= 0) return
  const db = getConnection()
  db.prepare(
    `
    UPDATE tasks SET
      accumulated_ms = accumulated_ms + ?,
      updated_at = ?
    WHERE id = ?
  `
  ).run(ms, atIso || new Date().toISOString(), taskId)
}

/**
 * Persiste el tramo aún no acreditado a la tarea vinculada al segmento actual.
 * @returns {number} ms acreditados en esta llamada
 */
function flushUncreditedSegment() {
  if (state.controlMode === 'stopwatch') {
    return flushStopwatchCredits()
  }
  if (state.periodType !== 'focus') return 0
  if (state.status !== 'running' && state.status !== 'paused') return 0

  const elapsed = currentElapsedMs()
  const uncredited = Math.max(0, elapsed - state.creditedMs)
  if (uncredited > 0 && state.bindingTaskId) {
    addAccumulatedMs(state.bindingTaskId, uncredited)
    state.creditedMs = elapsed
    taskService.emitChanged()
  } else {
    state.creditedMs = elapsed
  }
  return uncredited
}

function flushStopwatchCredits() {
  if (state.controlMode !== 'stopwatch') return 0
  if (state.status !== 'running' && state.status !== 'paused') return 0

  const work = currentStopwatchWorkMs()
  const uncredited = Math.max(0, work - state.stopwatchCreditedMs)
  if (uncredited > 0 && state.bindingTaskId) {
    addAccumulatedMs(state.bindingTaskId, uncredited)
    state.stopwatchCreditedMs = work
    taskService.emitChanged()
  } else {
    state.stopwatchCreditedMs = work
  }
  return uncredited
}

/**
 * Tiempo ya dedicado a la tarea activa (BD + tramo no acreditado del periodo).
 */
function taskDedicatedMs() {
  const settings = settingsService.getAll()
  const taskId = state.bindingTaskId || settings.active_task_id || null
  let base = 0
  if (taskId) {
    const task = taskService.getById(taskId)
    if (task) base = Math.max(0, Number(task.accumulated_ms) || 0)
  }
  if (
    state.controlMode === 'pomodoro' &&
    state.periodType === 'focus' &&
    (state.status === 'running' || state.status === 'paused')
  ) {
    base += Math.max(0, currentElapsedMs() - state.creditedMs)
  }
  return base
}

function currentStopwatchDisplayMs() {
  const settings = settingsService.getAll()
  const taskId = state.bindingTaskId || settings.active_task_id || null
  if (taskId) {
    const task = taskService.getById(taskId)
    const base = task ? Math.max(0, Number(task.accumulated_ms) || 0) : 0
    const uncredited = Math.max(
      0,
      currentStopwatchWorkMs() - state.stopwatchCreditedMs
    )
    return base + uncredited
  }
  return state.stopwatchDisplayOffsetMs + currentStopwatchWorkMs()
}

/**
 * Al cambiar la tarea activa durante un focus: acredita el tiempo al anterior
 * y empieza un nuevo tramo en la nueva tarea.
 */
function onActiveTaskChanged(newTaskId) {
  const nextId = newTaskId ? Number(newTaskId) : null
  if (state.controlMode === 'stopwatch') {
    if (state.status === 'running' || state.status === 'paused') {
      if (nextId === state.bindingTaskId) return
      flushStopwatchCredits()
      state.bindingTaskId = nextId
      broadcast()
    } else if (state.status === 'idle') {
      state.bindingTaskId = nextId
    }
    return
  }

  if (
    state.periodType === 'focus' &&
    (state.status === 'running' || state.status === 'paused')
  ) {
    if (nextId === state.bindingTaskId) return
    flushUncreditedSegment()
    state.bindingTaskId = nextId
    broadcast()
  } else if (state.status === 'idle') {
    state.bindingTaskId = nextId
  }
}

function getState() {
  if (state.controlMode === 'stopwatch') {
    const elapsedMs = currentStopwatchDisplayMs()
    const focusDuration = durationFor('focus')
    const cycleMs = focusDuration > 0 ? elapsedMs % focusDuration : 0
    const progress = focusDuration > 0 ? cycleMs / focusDuration : 0
    const workMs = currentStopwatchWorkMs()
    return {
      ...state,
      remainingMs: state.savedPomodoroRemainingMs ?? state.remainingMs,
      elapsedMs,
      segmentElapsedMs: Math.max(0, workMs - state.stopwatchCreditedMs),
      progress,
      strokeDashoffset: CIRCUMFERENCE * (1 - progress),
      circumference: CIRCUMFERENCE,
      display: formatElapsedMs(elapsedMs)
    }
  }

  const remainingMs = currentRemainingMs()
  const progress =
    state.durationMs > 0 ? 1 - remainingMs / state.durationMs : 0
  const elapsedMs =
    state.status === 'running' || state.status === 'paused'
      ? Math.max(0, state.durationMs - remainingMs)
      : 0
  const segmentElapsedMs =
    state.periodType === 'focus' &&
    (state.status === 'running' || state.status === 'paused')
      ? Math.max(0, elapsedMs - state.creditedMs)
      : 0
  return {
    ...state,
    remainingMs,
    elapsedMs,
    segmentElapsedMs,
    progress,
    strokeDashoffset: CIRCUMFERENCE * (1 - progress),
    circumference: CIRCUMFERENCE,
    display: formatMs(remainingMs)
  }
}

function formatMs(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatElapsedMs(ms) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function stopTick() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function startTick() {
  stopTick()
  tickTimer = setInterval(() => {
    if (state.status !== 'running') return
    if (state.controlMode === 'stopwatch') {
      broadcast()
      return
    }
    if (!state.endsAt) return
    const remaining = state.endsAt - Date.now()
    if (remaining <= 0) {
      completePeriod()
    } else {
      state.remainingMs = remaining
      broadcast()
    }
  }, 500)
}

/**
 * Cambia el modo del periodo (concentración / descansos).
 * Con force=true (tras confirmación del usuario): cancela el periodo en curso
 * o en pausa, NO inserta sesión completada, y restablece remainingMs a la
 * duración configurada del nuevo modo.
 */
function setMode(periodType, opts = {}) {
  if (state.controlMode === 'stopwatch') {
    return { ok: false, error: 'STOPWATCH_ACTIVE' }
  }

  const force = Boolean(opts.force)
  if (
    (state.status === 'running' || state.status === 'paused') &&
    !force
  ) {
    return { ok: false, error: 'TIMER_ACTIVE' }
  }

  // Cancelar tick; no llamar a completePeriod → no se guarda como completado
  // Tampoco se hace flush: el tramo no acreditado se descarta (reset/cambio forzado).
  stopTick()

  const durationMs = durationFor(periodType)
  const settings = settingsService.getAll()
  state = {
    ...state,
    status: 'idle',
    periodType,
    remainingMs: durationMs,
    durationMs,
    endsAt: null,
    startedAt: null,
    bindingTaskId:
      periodType === 'focus' ? settings.active_task_id || null : null,
    creditedMs: 0
  }
  broadcast()
  return { ok: true, data: getState() }
}

/**
 * Cambia entre control Pomodoro y Cronómetro.
 * Convierte el tiempo según las reglas de traspaso.
 */
function setControlMode(controlMode) {
  if (controlMode !== 'pomodoro' && controlMode !== 'stopwatch') {
    return { ok: false, error: 'INVALID_CONTROL_MODE' }
  }
  if (controlMode === state.controlMode) {
    return { ok: true, data: getState() }
  }
  if (controlMode === 'stopwatch') {
    return enterStopwatch()
  }
  return enterPomodoroFromStopwatch()
}

function enterStopwatch() {
  if (state.controlMode === 'pomodoro' && state.status === 'running' && state.endsAt) {
    state.remainingMs = Math.max(0, state.endsAt - Date.now())
  }

  const wasRunning = state.status === 'running'
  const wasPaused = state.status === 'paused'
  const wasActive = wasRunning || wasPaused

  // Persistir tramo pomodoro pendiente antes de medir la base del cronómetro
  const dedicatedBefore = taskDedicatedMs()
  if (wasActive && state.periodType === 'focus') {
    flushUncreditedSegment()
  }

  const settings = settingsService.getAll()
  const focusDuration = durationFor('focus')
  const activeTaskId = state.bindingTaskId || settings.active_task_id || null

  // Si venimos de un descanso, el traspaso de vuelta cuenta como focus completo
  if (state.periodType !== 'focus') {
    state.savedPomodoroRemainingMs = focusDuration
    state.savedPomodoroDurationMs = focusDuration
    state.savedPomodoroPeriodType = 'focus'
    state.periodType = 'focus'
    state.durationMs = focusDuration
    state.remainingMs = focusDuration
    state.bindingTaskId = activeTaskId
    state.creditedMs = 0
  } else {
    state.savedPomodoroRemainingMs = state.remainingMs
    state.savedPomodoroDurationMs = state.durationMs
    state.savedPomodoroPeriodType = 'focus'
    if (!wasActive) {
      state.bindingTaskId = activeTaskId
    }
  }

  state.controlMode = 'stopwatch'
  state.stopwatchWorkMs = 0
  state.stopwatchCreditedMs = 0
  // Con tarea: el display sale de accumulated_ms. Sin tarea: conservar elapsed de focus.
  state.stopwatchDisplayOffsetMs = activeTaskId ? 0 : dedicatedBefore
  state.endsAt = null

  if (wasRunning) {
    state.status = 'running'
    state.stopwatchRunningSince = Date.now()
    if (!state.startedAt) state.startedAt = new Date().toISOString()
    startTick()
  } else if (wasPaused) {
    state.status = 'paused'
    state.stopwatchRunningSince = null
    stopTick()
  } else {
    state.status = 'idle'
    state.stopwatchRunningSince = null
    stopTick()
  }

  broadcast()
  return { ok: true, data: getState() }
}

/**
 * Registra N sesiones de focus completadas durante el cronómetro.
 * El accumulated_ms ya se flusheó; solo incrementa contadores y filas de sesión.
 */
function recordFocusSessionsFromStopwatch(count, taskId, durationMs) {
  if (count <= 0) return
  const db = getConnection()
  const endedAt = new Date().toISOString()
  const startedAt = state.startedAt || endedAt
  const dur = Math.max(0, durationMs)

  const tx = db.transaction(() => {
    const insert = db.prepare(
      `
      INSERT INTO pomodoro_sessions (
        period_type, started_at, ended_at, duration_ms, completed, task_id
      ) VALUES ('focus', ?, ?, ?, 1, ?)
    `
    )
    const bump = db.prepare(
      `
      UPDATE tasks SET
        completed_pomodoros = completed_pomodoros + 1,
        updated_at = ?
      WHERE id = ?
    `
    )
    for (let i = 0; i < count; i++) {
      insert.run(startedAt, endedAt, dur, taskId)
      if (taskId) bump.run(endedAt, taskId)
    }
  })
  tx()

  for (let i = 0; i < count; i++) {
    streakService.recordFocusCompletion()
    state.sessionInCycle += 1
    state.completedFocusToday += 1
  }
  taskService.emitChanged()
}

function enterPomodoroFromStopwatch() {
  freezeStopwatchWork()
  flushStopwatchCredits()

  const workMs = state.stopwatchWorkMs
  const remainingAtSwitch =
    state.savedPomodoroRemainingMs != null
      ? state.savedPomodoroRemainingMs
      : durationFor('focus')
  const focusDuration = durationFor('focus')
  const settings = settingsService.getAll()
  const taskId = state.bindingTaskId || settings.active_task_id || null
  const wasRunning = state.status === 'running'
  const wasPaused = state.status === 'paused'

  // remaining puede ser negativo tras restar el tiempo en cronómetro
  let remaining = remainingAtSwitch - workMs
  let sessionsCompleted = 0

  if (remaining <= 0) {
    // Se agotó el remanente del pomodoro que había al cambiar
    sessionsCompleted = 1
    const overrun = -remaining
    if (focusDuration > 0) {
      sessionsCompleted += Math.floor(overrun / focusDuration)
      const leftover = overrun % focusDuration
      remaining = leftover === 0 ? focusDuration : focusDuration - leftover
    } else {
      remaining = 0
    }
  }

  if (sessionsCompleted > 0) {
    recordFocusSessionsFromStopwatch(sessionsCompleted, taskId, focusDuration)
  }

  const nextDuration = focusDuration
  const nextRemaining = Math.max(0, remaining)
  state.controlMode = 'pomodoro'
  state.periodType = 'focus'
  state.durationMs = nextDuration
  state.remainingMs = nextRemaining
  // Ese tramo (duration - remaining) ya se acreditó al entrar/usar el cronómetro.
  // Si creditedMs queda en 0, la UI y el próximo flush lo vuelven a sumar.
  state.creditedMs =
    nextRemaining > 0 && nextRemaining < nextDuration
      ? Math.max(0, nextDuration - nextRemaining)
      : 0
  state.bindingTaskId = settings.active_task_id || null
  state.endsAt = null
  clearStopwatchFields()

  if (wasRunning && state.remainingMs > 0) {
    state.status = 'running'
    state.startedAt = new Date().toISOString()
    state.endsAt = Date.now() + state.remainingMs
    startTick()
  } else if (wasPaused && state.remainingMs > 0) {
    state.status = 'paused'
    stopTick()
  } else if (sessionsCompleted > 0 && state.remainingMs === focusDuration) {
    // Exactamente al límite de una sesión: dejar listo el siguiente pomodoro
    state.status = 'idle'
    state.startedAt = null
    state.creditedMs = 0
    stopTick()
    notificationService.notifyPeriodComplete('focus')
  } else if (wasRunning || wasPaused) {
    state.status = 'paused'
    stopTick()
  } else {
    state.status = 'idle'
    state.startedAt = null
    state.creditedMs = 0
    stopTick()
  }

  broadcast()
  return { ok: true, data: getState() }
}

function start(opts = {}) {
  if (state.status === 'running') {
    return { ok: false, error: 'ALREADY_RUNNING' }
  }

  if (state.controlMode === 'stopwatch') {
    if (opts.periodType) {
      return { ok: false, error: 'STOPWATCH_ACTIVE' }
    }
    const settings = settingsService.getAll()
    state.status = 'running'
    state.periodType = 'focus'
    if (!state.startedAt) state.startedAt = new Date().toISOString()
    state.bindingTaskId = settings.active_task_id || null
    state.stopwatchRunningSince = Date.now()
    state.endsAt = null
    if (opts.taskId) {
      taskService.setActive(opts.taskId)
      state.bindingTaskId = Number(opts.taskId)
    }
    startTick()
    broadcast()
    return { ok: true, data: getState() }
  }

  if (opts.periodType) {
    const durationMs = durationFor(opts.periodType)
    state.periodType = opts.periodType
    state.durationMs = durationMs
    state.remainingMs = durationMs
  } else if (state.status === 'idle') {
    state.durationMs = durationFor(state.periodType)
    state.remainingMs = state.durationMs
  }

  if (opts.taskId) {
    taskService.setActive(opts.taskId)
  }

  const settings = settingsService.getAll()
  state.status = 'running'
  state.startedAt = new Date().toISOString()
  state.endsAt = Date.now() + state.remainingMs
  state.creditedMs = 0
  state.bindingTaskId =
    state.periodType === 'focus' ? settings.active_task_id || null : null
  startTick()
  broadcast()
  return { ok: true, data: getState() }
}

function pause() {
  if (state.status !== 'running') {
    return { ok: false, error: 'NOT_RUNNING' }
  }
  if (state.controlMode === 'stopwatch') {
    freezeStopwatchWork()
    state.status = 'paused'
    stopTick()
    broadcast()
    return { ok: true, data: getState() }
  }
  state.remainingMs = Math.max(0, state.endsAt - Date.now())
  state.endsAt = null
  state.status = 'paused'
  stopTick()
  broadcast()
  return { ok: true, data: getState() }
}

function resume() {
  if (state.status !== 'paused') {
    return { ok: false, error: 'NOT_PAUSED' }
  }
  if (state.controlMode === 'stopwatch') {
    state.status = 'running'
    state.stopwatchRunningSince = Date.now()
    startTick()
    broadcast()
    return { ok: true, data: getState() }
  }
  state.status = 'running'
  state.endsAt = Date.now() + state.remainingMs
  startTick()
  broadcast()
  return { ok: true, data: getState() }
}

function reset() {
  stopTick()
  if (state.controlMode === 'stopwatch') {
    // Descarta trabajo no acreditado del cronómetro; lo ya flusheado permanece.
    const settings = settingsService.getAll()
    state = {
      ...state,
      status: 'idle',
      stopwatchWorkMs: 0,
      stopwatchRunningSince: null,
      stopwatchCreditedMs: 0,
      stopwatchDisplayOffsetMs: 0,
      endsAt: null,
      startedAt: null,
      bindingTaskId: settings.active_task_id || null,
      creditedMs: 0
    }
    broadcast()
    return { ok: true, data: getState() }
  }
  // Descarta el tramo no acreditado; lo ya flusheado a otras tareas permanece.
  const durationMs = durationFor(state.periodType)
  const settings = settingsService.getAll()
  state = {
    ...state,
    status: 'idle',
    remainingMs: durationMs,
    durationMs,
    endsAt: null,
    startedAt: null,
    bindingTaskId:
      state.periodType === 'focus' ? settings.active_task_id || null : null,
    creditedMs: 0
  }
  broadcast()
  return { ok: true, data: getState() }
}

function stop() {
  return reset()
}

function completePeriod() {
  if (state.controlMode === 'stopwatch') return

  stopTick()
  const endedAt = new Date().toISOString()
  const startedAt = state.startedAt || endedAt
  const durationMs = state.durationMs
  const periodType = state.periodType
  const settings = settingsService.getAll()
  const taskId =
    periodType === 'focus'
      ? state.bindingTaskId || settings.active_task_id
      : null
  const uncredited =
    periodType === 'focus'
      ? Math.max(0, durationMs - state.creditedMs)
      : 0

  const db = getConnection()
  const tx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO pomodoro_sessions (
        period_type, started_at, ended_at, duration_ms, completed, task_id
      ) VALUES (?, ?, ?, ?, 1, ?)
    `
    ).run(periodType, startedAt, endedAt, durationMs, taskId)

    if (periodType === 'focus' && taskId) {
      db.prepare(
        `
        UPDATE tasks SET
          completed_pomodoros = completed_pomodoros + 1,
          accumulated_ms = accumulated_ms + ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(uncredited, endedAt, taskId)
    }
  })
  tx()

  if (periodType === 'focus') {
    streakService.recordFocusCompletion()
    state.sessionInCycle += 1
    state.completedFocusToday += 1
    taskService.emitChanged()
  } else if (periodType === 'short_break') {
    state.completedShortBreakToday += 1
  } else if (periodType === 'long_break') {
    state.completedLongBreakToday += 1
  }

  notificationService.notifyPeriodComplete(periodType)

  const untilLong = settings.pomodoros_until_long_break || 4
  let nextType = 'short_break'
  if (periodType === 'focus') {
    if (state.sessionInCycle % untilLong === 0) {
      nextType = 'long_break'
    } else {
      nextType = 'short_break'
    }
  } else {
    nextType = 'focus'
  }

  const nextDuration = durationFor(nextType)
  state = {
    ...state,
    status: 'idle',
    periodType: nextType,
    remainingMs: nextDuration,
    durationMs: nextDuration,
    endsAt: null,
    startedAt: null,
    bindingTaskId:
      nextType === 'focus' ? settings.active_task_id || null : null,
    creditedMs: 0
  }
  broadcast()
}

function syncDurationsFromSettings() {
  if (state.status !== 'idle') return
  if (state.controlMode === 'stopwatch') return
  const durationMs = durationFor(state.periodType)
  state.remainingMs = durationMs
  state.durationMs = durationMs
  broadcast()
}

function loadCompletedCountsToday() {
  const day = streakService.localDay()
  const db = getConnection()
  const rows = db
    .prepare(
      `
      SELECT period_type, COUNT(*) AS n
      FROM pomodoro_sessions
      WHERE completed = 1
        AND date(started_at, 'localtime') = ?
      GROUP BY period_type
    `
    )
    .all(day)

  const counts = { focus: 0, short_break: 0, long_break: 0 }
  for (const row of rows) {
    if (row.period_type in counts) counts[row.period_type] = row.n
  }
  state.completedFocusToday = counts.focus
  state.completedShortBreakToday = counts.short_break
  state.completedLongBreakToday = counts.long_break
  state.sessionInCycle = counts.focus % (settingsService.getAll().pomodoros_until_long_break || 4)
}

function clearSnapshot() {
  const db = getConnection()
  db.prepare('DELETE FROM settings WHERE key = ?').run(SNAPSHOT_KEY)
}

function writeSnapshot() {
  const db = getConnection()
  if (state.status === 'idle') {
    clearSnapshot()
    return
  }

  const payload = JSON.stringify({
    status: state.status,
    controlMode: state.controlMode,
    periodType: state.periodType,
    remainingMs: state.remainingMs,
    durationMs: state.durationMs,
    startedAt: state.startedAt,
    bindingTaskId: state.bindingTaskId,
    creditedMs: state.creditedMs,
    sessionInCycle: state.sessionInCycle,
    stopwatchWorkMs: state.stopwatchWorkMs,
    stopwatchCreditedMs: state.stopwatchCreditedMs,
    stopwatchDisplayOffsetMs: state.stopwatchDisplayOffsetMs,
    savedPomodoroRemainingMs: state.savedPomodoroRemainingMs,
    savedPomodoroDurationMs: state.savedPomodoroDurationMs,
    savedPomodoroPeriodType: state.savedPomodoroPeriodType
  })
  db.prepare(
    `
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `
  ).run(SNAPSHOT_KEY, payload)
}

/**
 * Restaura un pomodoro en pausa guardado al cerrar la app.
 * Siempre vuelve como paused (nunca running) para que el usuario reanude a mano.
 * @returns {boolean}
 */
function restoreSnapshot() {
  const db = getConnection()
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(SNAPSHOT_KEY)
  if (!row?.value) return false

  let snap
  try {
    snap = JSON.parse(row.value)
  } catch {
    clearSnapshot()
    return false
  }

  const controlMode =
    snap.controlMode === 'stopwatch' ? 'stopwatch' : 'pomodoro'
  const remainingMs = Math.max(0, Number(snap.remainingMs) || 0)
  const durationMs = Math.max(remainingMs, Number(snap.durationMs) || 0)
  const periodType = snap.periodType
  const validType =
    periodType === 'focus' ||
    periodType === 'short_break' ||
    periodType === 'long_break'
  const wasActive =
    snap.status === 'paused' || snap.status === 'running'

  if (controlMode === 'stopwatch') {
    if (!wasActive) {
      clearSnapshot()
      return false
    }
    state = {
      ...state,
      status: 'paused',
      controlMode: 'stopwatch',
      periodType: periodType === 'focus' ? 'focus' : 'focus',
      remainingMs,
      durationMs: durationMs || durationFor('focus'),
      endsAt: null,
      startedAt: snap.startedAt || null,
      bindingTaskId:
        snap.bindingTaskId != null ? Number(snap.bindingTaskId) : null,
      creditedMs: Math.max(0, Number(snap.creditedMs) || 0),
      sessionInCycle: Number.isFinite(Number(snap.sessionInCycle))
        ? Number(snap.sessionInCycle)
        : state.sessionInCycle,
      stopwatchWorkMs: Math.max(0, Number(snap.stopwatchWorkMs) || 0),
      stopwatchRunningSince: null,
      stopwatchCreditedMs: Math.max(0, Number(snap.stopwatchCreditedMs) || 0),
      stopwatchDisplayOffsetMs: Math.max(
        0,
        Number(snap.stopwatchDisplayOffsetMs) || 0
      ),
      savedPomodoroRemainingMs:
        snap.savedPomodoroRemainingMs != null
          ? Math.max(0, Number(snap.savedPomodoroRemainingMs))
          : null,
      savedPomodoroDurationMs:
        snap.savedPomodoroDurationMs != null
          ? Math.max(0, Number(snap.savedPomodoroDurationMs))
          : null,
      savedPomodoroPeriodType: snap.savedPomodoroPeriodType || 'focus'
    }
    clearSnapshot()
    return true
  }

  if (!wasActive || !validType || remainingMs <= 0 || durationMs <= 0) {
    clearSnapshot()
    return false
  }

  state = {
    ...state,
    status: 'paused',
    controlMode: 'pomodoro',
    periodType,
    remainingMs,
    durationMs,
    endsAt: null,
    startedAt: snap.startedAt || null,
    bindingTaskId:
      snap.bindingTaskId != null ? Number(snap.bindingTaskId) : null,
    creditedMs: Math.max(0, Number(snap.creditedMs) || 0),
    sessionInCycle: Number.isFinite(Number(snap.sessionInCycle))
      ? Number(snap.sessionInCycle)
      : state.sessionInCycle
  }
  clearStopwatchFields()
  clearSnapshot()
  return true
}

/**
 * Al cerrar la app: pausa si estaba en marcha, acredita el tiempo de la tarea
 * en curso y persiste el estado del temporizador para restaurarlo al reabrir.
 */
function persistForQuit() {
  if (state.status === 'running') {
    if (state.controlMode === 'stopwatch') {
      freezeStopwatchWork()
    } else {
      state.remainingMs = Math.max(0, (state.endsAt || Date.now()) - Date.now())
      state.endsAt = null
    }
    state.status = 'paused'
    stopTick()
  }
  flushUncreditedSegment()
  writeSnapshot()
}

function init() {
  const durationMs = durationFor('focus')
  state.remainingMs = durationMs
  state.durationMs = durationMs
  state.periodType = 'focus'
  state.controlMode = 'pomodoro'
  state.status = 'idle'
  clearAttribution()
  clearStopwatchFields()
  try {
    loadCompletedCountsToday()
    const restored = restoreSnapshot()
    if (!restored) {
      const settings = settingsService.getAll()
      state.bindingTaskId = settings.active_task_id || null
    }
  } catch {
    // BD aún no disponible en smoke/tests tempranos
  }
}

module.exports = {
  init,
  getState,
  setMode,
  setControlMode,
  start,
  pause,
  resume,
  reset,
  stop,
  syncDurationsFromSettings,
  onActiveTaskChanged,
  persistForQuit,
  CIRCUMFERENCE
}
