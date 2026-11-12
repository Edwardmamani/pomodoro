const { BrowserWindow } = require('electron')
const SettingsModel = require('../models/SettingsModel')
const TaskModel = require('../models/TaskModel')
const SessionModel = require('../models/SessionModel')
const StreakModel = require('../models/StreakModel')
const TaskController = require('./TaskController')
const TimerStateEngine = require('../services/TimerStateEngine')
const { localDay } = require('../lib/date')

class TimerController {
  constructor() {
    this.settings = new SettingsModel()
    this.tasks = new TaskModel()
    this.sessions = new SessionModel()
    this.streak = new StreakModel()
    this.engine = new TimerStateEngine({
      settings: this.settings, tasks: this.tasks, sessions: this.sessions, streak: this.streak
    })
    this.tickTimer = null
  }

  get state() { return this.engine.state }
  set state(val) { this.engine.state = val }
  get() { return { ok: true, data: this.getState() } }
  setMode() { return { ok: true, data: this.getState() } }
  setControlMode() { return { ok: true, data: this.getState() } }

  start(_event, opts = {}) {
    if (this.state.status === 'running') return { ok: false, error: 'ALREADY_RUNNING' }
    if (opts.taskId) {
      TaskController.setActive(null, opts.taskId)
      this.state.bindingTaskId = Number(opts.taskId)
    } else {
      const activeId = this.settings.getAll().active_task_id
      this.state.bindingTaskId = activeId ? Number(activeId) : null
    }
    this.state.status = 'running'
    if (!this.state.startedAt) this.state.startedAt = new Date().toISOString()
    this.state.stopwatchRunningSince = Date.now()
    this.startTick(); this.broadcast()
    return { ok: true, data: this.getState() }
  }

  pause() {
    if (this.state.status !== 'running') return { ok: false, error: 'NOT_RUNNING' }
    this.engine.freezeWork(); this.flushStopwatchCredits()
    this.state.status = 'paused'; this.stopTick(); this.broadcast()
    return { ok: true, data: this.getState() }
  }

  resume() {
    if (this.state.status !== 'paused') return { ok: false, error: 'NOT_PAUSED' }
    this.state.status = 'running'; this.state.stopwatchRunningSince = Date.now()
    this.startTick(); this.broadcast()
    return { ok: true, data: this.getState() }
  }

  reset() {
    this.stopTick(); this.engine.freezeWork(); this.flushStopwatchCredits()
    if (this.state.stopwatchWorkMs >= 60000) {
      try { this.streak.recordFocusCompletion(localDay()); this.state.completedFocusToday += 1 } catch { /* ignore */ }
    }
    const activeId = this.settings.getAll().active_task_id
    this.state = {
      ...this.state, status: 'idle', stopwatchWorkMs: 0, stopwatchRunningSince: null,
      stopwatchCreditedMs: 0, startedAt: null, bindingTaskId: activeId ? Number(activeId) : null
    }
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  stop() { return this.reset() }

  init() {
    this.state = this.engine.createInitialState()
    try {
      this.engine.loadCompletedToday()
      const activeId = this.settings.getAll().active_task_id
      this.state.bindingTaskId = activeId ? Number(activeId) : null
    } catch { /* ignore */ }
  }

  persistForQuit() {
    if (this.state.status === 'running') { this.engine.freezeWork(); this.state.status = 'paused'; this.stopTick() }
    this.flushStopwatchCredits()
  }

  syncDurationsFromSettings() {}

  onActiveTaskChanged(newTaskId) {
    const nextId = newTaskId ? Number(newTaskId) : null
    if (nextId === this.state.bindingTaskId) return
    if (this.state.status === 'running' || this.state.status === 'paused') {
      this.flushStopwatchCredits(); this.state.bindingTaskId = nextId; this.broadcast()
    } else {
      this.state.bindingTaskId = nextId
    }
  }

  flushStopwatchCredits() { return this.engine.flushCredits(() => TaskController.emitChanged()) }
  stopTick() { if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null } }
  startTick() {
    this.stopTick()
    this.tickTimer = setInterval(() => { if (this.state.status === 'running') this.broadcast() }, 500)
  }
  broadcast() {
    const payload = this.getState()
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('pomodoro:timer:state', payload)
  }
  getState() { return this.engine.buildSnapshot() }
}

module.exports = new TimerController()
