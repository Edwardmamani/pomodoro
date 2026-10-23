const { BrowserWindow } = require('electron')
const SettingsModel = require('../models/SettingsModel')
const TaskModel = require('../models/TaskModel')
const SessionModel = require('../models/SessionModel')
const StreakModel = require('../models/StreakModel')
const TaskController = require('./TaskController')
const { localDay } = require('../lib/date')

const CIRCUMFERENCE = 2 * Math.PI * 138

function initialState() {
  return {
    status: 'idle', // 'idle' | 'running' | 'paused'
    controlMode: 'stopwatch',
    periodType: 'stopwatch',
    elapsedMs: 0,
    stopwatchWorkMs: 0,
    stopwatchRunningSince: null,
    stopwatchCreditedMs: 0,
    bindingTaskId: null,
    startedAt: null,
    completedFocusToday: 0
  }
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

class TimerController {
  constructor() {
    this.settings = new SettingsModel()
    this.tasks = new TaskModel()
    this.sessions = new SessionModel()
    this.streak = new StreakModel()
    this.state = initialState()
    this.tickTimer = null
  }

  // --- Rutas IPC ---

  get() {
    return { ok: true, data: this.getState() }
  }

  setMode() {
    return { ok: true, data: this.getState() }
  }

  setControlMode() {
    return { ok: true, data: this.getState() }
  }

  start(_event, opts) {
    opts = opts || {}
    const state = this.state
    if (state.status === 'running') {
      return { ok: false, error: 'ALREADY_RUNNING' }
    }

    if (opts.taskId) {
      TaskController.setActive(null, opts.taskId)
      state.bindingTaskId = Number(opts.taskId)
    } else {
      const activeId = this.settings.getAll().active_task_id
      state.bindingTaskId = activeId ? Number(activeId) : null
    }

    state.status = 'running'
    if (!state.startedAt) state.startedAt = new Date().toISOString()
    state.stopwatchRunningSince = Date.now()

    this.startTick()
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  pause() {
    const state = this.state
    if (state.status !== 'running') {
      return { ok: false, error: 'NOT_RUNNING' }
    }

    this.freezeStopwatchWork()
    this.flushStopwatchCredits()
    state.status = 'paused'
    this.stopTick()
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  resume() {
    const state = this.state
    if (state.status !== 'paused') {
      return { ok: false, error: 'NOT_PAUSED' }
    }

    state.status = 'running'
    state.stopwatchRunningSince = Date.now()
    this.startTick()
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  reset() {
    this.stopTick()
    this.freezeStopwatchWork()
    this.flushStopwatchCredits()

    if (this.state.stopwatchWorkMs >= 60000) {
      try {
        this.streak.recordFocusCompletion(localDay())
        this.state.completedFocusToday += 1
      } catch {
        /* ignore */
      }
    }

    const settings = this.settings.getAll()
    this.state = {
      ...this.state,
      status: 'idle',
      stopwatchWorkMs: 0,
      stopwatchRunningSince: null,
      stopwatchCreditedMs: 0,
      startedAt: null,
      bindingTaskId: settings.active_task_id ? Number(settings.active_task_id) : null
    }

    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  stop() {
    return this.reset()
  }

  // --- Ciclo de vida ---

  init() {
    this.state = initialState()
    try {
      this.loadCompletedToday()
      const activeId = this.settings.getAll().active_task_id
      this.state.bindingTaskId = activeId ? Number(activeId) : null
    } catch {
      /* ignore */
    }
  }

  loadCompletedToday() {
    try {
      const today = localDay()
      const row = this.streak.db
        .prepare('SELECT focus_sessions_count FROM activity_days WHERE day = ?')
        .get(today)
      if (row) {
        this.state.completedFocusToday = row.focus_sessions_count || 0
      }
    } catch {
      /* ignore */
    }
  }

  persistForQuit() {
    if (this.state.status === 'running') {
      this.freezeStopwatchWork()
      this.state.status = 'paused'
      this.stopTick()
    }
    this.flushStopwatchCredits()
  }

  syncDurationsFromSettings() {
    // No-op for stopwatch
  }

  onActiveTaskChanged(newTaskId) {
    const state = this.state
    const nextId = newTaskId ? Number(newTaskId) : null
    if (nextId === state.bindingTaskId) return

    if (state.status === 'running' || state.status === 'paused') {
      this.flushStopwatchCredits()
      state.bindingTaskId = nextId
      this.broadcast()
    } else {
      state.bindingTaskId = nextId
    }
  }

  currentStopwatchWorkMs() {
    const state = this.state
    let ms = state.stopwatchWorkMs
    if (state.status === 'running' && state.stopwatchRunningSince) {
      ms += Math.max(0, Date.now() - state.stopwatchRunningSince)
    }
    return Math.max(0, ms)
  }

  freezeStopwatchWork() {
    const state = this.state
    if (state.status === 'running' && state.stopwatchRunningSince) {
      state.stopwatchWorkMs += Math.max(0, Date.now() - state.stopwatchRunningSince)
      state.stopwatchRunningSince = null
    }
  }

  addAccumulatedMs(taskId, ms) {
    if (!taskId || ms <= 0) return
    this.sessions.addAccumulatedMs(taskId, ms)
  }

  flushStopwatchCredits() {
    const state = this.state
    if (state.status !== 'running' && state.status !== 'paused') return 0

    const work = this.currentStopwatchWorkMs()
    const uncredited = Math.max(0, work - state.stopwatchCreditedMs)
    if (uncredited > 0 && state.bindingTaskId) {
      this.addAccumulatedMs(state.bindingTaskId, uncredited)
      state.stopwatchCreditedMs = work
      TaskController.emitChanged()
    } else {
      state.stopwatchCreditedMs = work
    }
    return uncredited
  }

  taskAccumulatedMs(taskId) {
    const task = taskId ? this.tasks.getById(taskId) : null
    return task ? Math.max(0, Number(task.accumulated_ms) || 0) : 0
  }

  currentStopwatchDisplayMs() {
    const state = this.state
    const taskId = state.bindingTaskId || this.settings.getAll().active_task_id || null
    if (taskId) {
      const uncredited = Math.max(
        0,
        this.currentStopwatchWorkMs() - state.stopwatchCreditedMs
      )
      return this.taskAccumulatedMs(taskId) + uncredited
    }
    return this.currentStopwatchWorkMs()
  }

  stopTick() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  startTick() {
    this.stopTick()
    this.tickTimer = setInterval(() => {
      if (this.state.status === 'running') {
        this.broadcast()
      }
    }, 500)
  }

  broadcast() {
    const payload = this.getState()
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('pomodoro:timer:state', payload)
    }
  }

  getState() {
    const state = this.state
    const workMs = this.currentStopwatchWorkMs()
    const displayMs = this.currentStopwatchDisplayMs()
    // Animación perimetral: ciclo cada 60s
    const progress = (workMs % 60000) / 60000
    const uncredited = Math.max(0, workMs - state.stopwatchCreditedMs)

    return {
      status: state.status,
      controlMode: 'stopwatch',
      periodType: 'stopwatch',
      remainingMs: 0,
      durationMs: 0,
      elapsedMs: displayMs,
      segmentElapsedMs: uncredited,
      sessionElapsedMs: workMs,
      progress,
      strokeDashoffset: CIRCUMFERENCE * (1 - progress),
      circumference: CIRCUMFERENCE,
      display: formatElapsedMs(displayMs),
      bindingTaskId: state.bindingTaskId,
      completedFocusToday: state.completedFocusToday
    }
  }
}

module.exports = new TimerController()
