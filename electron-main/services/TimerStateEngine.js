const { localDay } = require('../lib/date')

const CIRCUMFERENCE = 2 * Math.PI * 138

class TimerStateEngine {
  constructor({ settings, tasks, sessions, streak }) {
    this.settings = settings
    this.tasks = tasks
    this.sessions = sessions
    this.streak = streak
    this.state = this.createInitialState()
  }

  createInitialState() {
    return {
      status: 'idle',
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

  formatElapsedMs(ms) {
    const totalSec = Math.floor(Math.max(0, ms) / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const pad = (n) => String(n).padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  loadCompletedToday() {
    try {
      const row = this.streak.db
        .prepare('SELECT focus_sessions_count FROM activity_days WHERE day = ?')
        .get(localDay())
      if (row) this.state.completedFocusToday = row.focus_sessions_count || 0
    } catch { /* ignore */ }
  }

  currentWorkMs() {
    let ms = this.state.stopwatchWorkMs
    if (this.state.status === 'running' && this.state.stopwatchRunningSince) {
      ms += Math.max(0, Date.now() - this.state.stopwatchRunningSince)
    }
    return Math.max(0, ms)
  }

  freezeWork() {
    if (this.state.status === 'running' && this.state.stopwatchRunningSince) {
      this.state.stopwatchWorkMs += Math.max(0, Date.now() - this.state.stopwatchRunningSince)
      this.state.stopwatchRunningSince = null
    }
  }

  flushCredits(onEmitChanged) {
    if (this.state.status !== 'running' && this.state.status !== 'paused') return 0
    const work = this.currentWorkMs()
    const uncredited = Math.max(0, work - this.state.stopwatchCreditedMs)
    if (uncredited > 0 && this.state.bindingTaskId) {
      this.sessions.addAccumulatedMs(this.state.bindingTaskId, uncredited)
      this.state.stopwatchCreditedMs = work
      onEmitChanged?.()
    } else {
      this.state.stopwatchCreditedMs = work
    }
    return uncredited
  }

  currentDisplayMs() {
    const taskId = this.state.bindingTaskId || this.settings.getAll().active_task_id || null
    if (taskId) {
      const uncredited = Math.max(0, this.currentWorkMs() - this.state.stopwatchCreditedMs)
      const task = this.tasks.getById(taskId)
      const base = task ? Math.max(0, Number(task.accumulated_ms) || 0) : 0
      return base + uncredited
    }
    return this.currentWorkMs()
  }

  buildSnapshot() {
    const workMs = this.currentWorkMs()
    const displayMs = this.currentDisplayMs()
    const progress = (workMs % 60000) / 60000
    const uncredited = Math.max(0, workMs - this.state.stopwatchCreditedMs)

    return {
      status: this.state.status,
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
      display: this.formatElapsedMs(displayMs),
      bindingTaskId: this.state.bindingTaskId,
      completedFocusToday: this.state.completedFocusToday
    }
  }
}

module.exports = TimerStateEngine
