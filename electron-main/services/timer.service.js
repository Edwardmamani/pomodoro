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
  completedLongBreakToday: 0
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
  if (state.status === 'running' && state.endsAt) {
    return Math.max(0, state.endsAt - Date.now())
  }
  return state.remainingMs
}

function currentElapsedMs() {
  if (state.status !== 'running' && state.status !== 'paused') return 0
  return Math.max(0, state.durationMs - currentRemainingMs())
}

function clearAttribution() {
  state.bindingTaskId = null
  state.creditedMs = 0
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

/**
 * Al cambiar la tarea activa durante un focus: acredita el tiempo al anterior
 * y empieza un nuevo tramo en la nueva tarea.
 */
function onActiveTaskChanged(newTaskId) {
  const nextId = newTaskId ? Number(newTaskId) : null
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

function stopTick() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function startTick() {
  stopTick()
  tickTimer = setInterval(() => {
    if (state.status !== 'running' || !state.endsAt) return
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
 * Cambia el modo del periodo.
 * Con force=true (tras confirmación del usuario): cancela el periodo en curso
 * o en pausa, NO inserta sesión completada, y restablece remainingMs a la
 * duración configurada del nuevo modo.
 */
function setMode(periodType, opts = {}) {
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

function start(opts = {}) {
  if (state.status === 'running') {
    return { ok: false, error: 'ALREADY_RUNNING' }
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
  state.status = 'running'
  state.endsAt = Date.now() + state.remainingMs
  startTick()
  broadcast()
  return { ok: true, data: getState() }
}

function reset() {
  stopTick()
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
    periodType: state.periodType,
    remainingMs: state.remainingMs,
    durationMs: state.durationMs,
    startedAt: state.startedAt,
    bindingTaskId: state.bindingTaskId,
    creditedMs: state.creditedMs,
    sessionInCycle: state.sessionInCycle
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

  const remainingMs = Math.max(0, Number(snap.remainingMs) || 0)
  const durationMs = Math.max(remainingMs, Number(snap.durationMs) || 0)
  const periodType = snap.periodType
  const validType =
    periodType === 'focus' ||
    periodType === 'short_break' ||
    periodType === 'long_break'
  const wasActive =
    snap.status === 'paused' || snap.status === 'running'

  if (!wasActive || !validType || remainingMs <= 0 || durationMs <= 0) {
    clearSnapshot()
    return false
  }

  state = {
    ...state,
    status: 'paused',
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
  clearSnapshot()
  return true
}

/**
 * Al cerrar la app: pausa si estaba en marcha, acredita el tiempo de la tarea
 * en curso y persiste el estado del temporizador para restaurarlo al reabrir.
 */
function persistForQuit() {
  if (state.status === 'running') {
    state.remainingMs = Math.max(0, (state.endsAt || Date.now()) - Date.now())
    state.endsAt = null
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
  state.status = 'idle'
  clearAttribution()
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
