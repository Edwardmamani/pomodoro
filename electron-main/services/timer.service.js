const { BrowserWindow, shell } = require('electron')
const { getConnection } = require('../db/connection')
const settingsService = require('./settings.service')
const taskService = require('./task.service')
const streakService = require('./streak.service')
const notificationService = require('./notification.service')

const CIRCUMFERENCE = 2 * Math.PI * 138

let state = {
  status: 'idle',
  periodType: 'focus',
  remainingMs: 25 * 60 * 1000,
  durationMs: 25 * 60 * 1000,
  endsAt: null,
  startedAt: null,
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

function getState() {
  let remainingMs = state.remainingMs
  if (state.status === 'running' && state.endsAt) {
    remainingMs = Math.max(0, state.endsAt - Date.now())
  }
  const progress =
    state.durationMs > 0 ? 1 - remainingMs / state.durationMs : 0
  return {
    ...state,
    remainingMs,
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
  stopTick()

  const durationMs = durationFor(periodType)
  state = {
    ...state,
    status: 'idle',
    periodType,
    remainingMs: durationMs,
    durationMs,
    endsAt: null,
    startedAt: null
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

  state.status = 'running'
  state.startedAt = new Date().toISOString()
  state.endsAt = Date.now() + state.remainingMs
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
  const durationMs = durationFor(state.periodType)
  state = {
    ...state,
    status: 'idle',
    remainingMs: durationMs,
    durationMs,
    endsAt: null,
    startedAt: null
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
    periodType === 'focus' ? settings.active_task_id : null

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
      ).run(durationMs, endedAt, taskId)
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
    startedAt: null
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

function init() {
  const durationMs = durationFor('focus')
  state.remainingMs = durationMs
  state.durationMs = durationMs
  state.periodType = 'focus'
  state.status = 'idle'
  try {
    loadCompletedCountsToday()
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
  CIRCUMFERENCE
}
