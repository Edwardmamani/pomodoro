const { BrowserWindow } = require('electron')
const SettingsModel = require('../models/SettingsModel')
const TaskModel = require('../models/TaskModel')
const SessionModel = require('../models/SessionModel')
const StreakModel = require('../models/StreakModel')
const TaskController = require('./TaskController')
const { notifyPeriodComplete } = require('../lib/notification')
const { localDay } = require('../lib/date')

const CIRCUMFERENCE = 2 * Math.PI * 138

function initialState() {
  return {
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

  /**
   * Cambia el modo del periodo (concentración / descansos).
   * Con force=true (tras confirmación del usuario): cancela el periodo en curso
   * o en pausa, NO inserta sesión completada, y restablece remainingMs a la
   * duración configurada del nuevo modo.
   */
  setMode(_event, periodType, opts) {
    const state = this.state
    if (state.controlMode === 'stopwatch') {
      return { ok: false, error: 'STOPWATCH_ACTIVE' }
    }

    const force = Boolean(opts?.force)
    if ((state.status === 'running' || state.status === 'paused') && !force) {
      return { ok: false, error: 'TIMER_ACTIVE' }
    }

    // Cancelar tick; no llamar a completePeriod → no se guarda como completado
    // Tampoco se hace flush: el tramo no acreditado se descarta (reset/cambio forzado).
    this.stopTick()

    const durationMs = this.durationFor(periodType)
    const settings = this.settings.getAll()
    this.state = {
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
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  /**
   * Cambia entre control Pomodoro y Cronómetro.
   * Convierte el tiempo según las reglas de traspaso.
   */
  setControlMode(_event, controlMode) {
    if (controlMode !== 'pomodoro' && controlMode !== 'stopwatch') {
      return { ok: false, error: 'INVALID_CONTROL_MODE' }
    }
    if (controlMode === this.state.controlMode) {
      return { ok: true, data: this.getState() }
    }
    if (controlMode === 'stopwatch') {
      return this.enterStopwatch()
    }
    return this.enterPomodoroFromStopwatch()
  }

  start(_event, opts) {
    opts = opts || {}
    const state = this.state
    if (state.status === 'running') {
      return { ok: false, error: 'ALREADY_RUNNING' }
    }

    if (state.controlMode === 'stopwatch') {
      if (opts.periodType) {
        return { ok: false, error: 'STOPWATCH_ACTIVE' }
      }
      const settings = this.settings.getAll()
      state.status = 'running'
      state.periodType = 'focus'
      if (!state.startedAt) state.startedAt = new Date().toISOString()
      state.bindingTaskId = settings.active_task_id || null
      state.stopwatchRunningSince = Date.now()
      state.endsAt = null
      if (opts.taskId) {
        TaskController.setActive(null, opts.taskId)
        this.state.bindingTaskId = Number(opts.taskId)
      }
      this.startTick()
      this.broadcast()
      return { ok: true, data: this.getState() }
    }

    if (opts.periodType) {
      const durationMs = this.durationFor(opts.periodType)
      state.periodType = opts.periodType
      state.durationMs = durationMs
      state.remainingMs = durationMs
    } else if (state.status === 'idle') {
      state.durationMs = this.durationFor(state.periodType)
      state.remainingMs = state.durationMs
    }

    if (opts.taskId) {
      TaskController.setActive(null, opts.taskId)
    }

    const settings = this.settings.getAll()
    const s = this.state
    s.status = 'running'
    s.startedAt = new Date().toISOString()
    s.endsAt = Date.now() + s.remainingMs
    s.creditedMs = 0
    s.bindingTaskId =
      s.periodType === 'focus' ? settings.active_task_id || null : null
    this.startTick()
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  pause() {
    const state = this.state
    if (state.status !== 'running') {
      return { ok: false, error: 'NOT_RUNNING' }
    }
    if (state.controlMode === 'stopwatch') {
      this.freezeStopwatchWork()
      state.status = 'paused'
      this.stopTick()
      this.broadcast()
      return { ok: true, data: this.getState() }
    }
    state.remainingMs = Math.max(0, state.endsAt - Date.now())
    state.endsAt = null
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
    if (state.controlMode === 'stopwatch') {
      state.status = 'running'
      state.stopwatchRunningSince = Date.now()
      this.startTick()
      this.broadcast()
      return { ok: true, data: this.getState() }
    }
    state.status = 'running'
    state.endsAt = Date.now() + state.remainingMs
    this.startTick()
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  reset() {
    this.stopTick()
    const settings = this.settings.getAll()
    if (this.state.controlMode === 'stopwatch') {
      // Descarta trabajo no acreditado del cronómetro; lo ya flusheado permanece.
      this.state = {
        ...this.state,
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
      this.broadcast()
      return { ok: true, data: this.getState() }
    }
    // Descarta el tramo no acreditado; lo ya flusheado a otras tareas permanece.
    const durationMs = this.durationFor(this.state.periodType)
    this.state = {
      ...this.state,
      status: 'idle',
      remainingMs: durationMs,
      durationMs,
      endsAt: null,
      startedAt: null,
      bindingTaskId:
        this.state.periodType === 'focus' ? settings.active_task_id || null : null,
      creditedMs: 0
    }
    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  stop() {
    return this.reset()
  }

  // --- Ciclo de vida (main.js y otros controladores) ---

  init() {
    const durationMs = this.durationFor('focus')
    const state = this.state
    state.remainingMs = durationMs
    state.durationMs = durationMs
    state.periodType = 'focus'
    state.controlMode = 'pomodoro'
    state.status = 'idle'
    this.clearAttribution()
    this.clearStopwatchFields()
    try {
      this.loadCompletedCountsToday()
      const restored = this.restoreSnapshot()
      if (!restored) {
        this.state.bindingTaskId = this.settings.getAll().active_task_id || null
      }
    } catch {
      // BD aún no disponible en smoke/tests tempranos
    }
  }

  /**
   * Al cerrar la app: pausa si estaba en marcha, acredita el tiempo de la tarea
   * en curso y persiste el estado del temporizador para restaurarlo al reabrir.
   */
  persistForQuit() {
    const state = this.state
    if (state.status === 'running') {
      if (state.controlMode === 'stopwatch') {
        this.freezeStopwatchWork()
      } else {
        state.remainingMs = Math.max(0, (state.endsAt || Date.now()) - Date.now())
        state.endsAt = null
      }
      state.status = 'paused'
      this.stopTick()
    }
    this.flushUncreditedSegment()
    this.writeSnapshot()
  }

  syncDurationsFromSettings() {
    const state = this.state
    if (state.status !== 'idle') return
    if (state.controlMode === 'stopwatch') return
    const durationMs = this.durationFor(state.periodType)
    state.remainingMs = durationMs
    state.durationMs = durationMs
    this.broadcast()
  }

  /**
   * Al cambiar la tarea activa durante un focus: acredita el tiempo al anterior
   * y empieza un nuevo tramo en la nueva tarea.
   */
  onActiveTaskChanged(newTaskId) {
    const state = this.state
    const nextId = newTaskId ? Number(newTaskId) : null
    if (state.controlMode === 'stopwatch') {
      if (state.status === 'running' || state.status === 'paused') {
        if (nextId === state.bindingTaskId) return
        this.flushStopwatchCredits()
        this.state.bindingTaskId = nextId
        this.broadcast()
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
      this.flushUncreditedSegment()
      this.state.bindingTaskId = nextId
      this.broadcast()
    } else if (state.status === 'idle') {
      state.bindingTaskId = nextId
    }
  }

  getState() {
    const state = this.state
    if (state.controlMode === 'stopwatch') {
      const elapsedMs = this.currentStopwatchDisplayMs()
      const focusDuration = this.durationFor('focus')
      const cycleMs = focusDuration > 0 ? elapsedMs % focusDuration : 0
      const progress = focusDuration > 0 ? cycleMs / focusDuration : 0
      const workMs = this.currentStopwatchWorkMs()
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

    const remainingMs = this.currentRemainingMs()
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

  // --- Internos ---

  broadcast() {
    const payload = this.getState()
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('pomodoro:timer:state', payload)
    }
  }

  durationFor(periodType) {
    const s = this.settings.getAll()
    if (periodType === 'short_break') return s.short_break_minutes * 60 * 1000
    if (periodType === 'long_break') return s.long_break_minutes * 60 * 1000
    return s.focus_minutes * 60 * 1000
  }

  currentRemainingMs() {
    const state = this.state
    if (state.controlMode === 'stopwatch') {
      return state.remainingMs
    }
    if (state.status === 'running' && state.endsAt) {
      return Math.max(0, state.endsAt - Date.now())
    }
    return state.remainingMs
  }

  currentElapsedMs() {
    const state = this.state
    if (state.status !== 'running' && state.status !== 'paused') return 0
    if (state.controlMode === 'stopwatch') {
      return this.currentStopwatchWorkMs()
    }
    return Math.max(0, state.durationMs - this.currentRemainingMs())
  }

  currentStopwatchWorkMs() {
    const state = this.state
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

  freezeStopwatchWork() {
    const state = this.state
    if (
      state.controlMode === 'stopwatch' &&
      state.status === 'running' &&
      state.stopwatchRunningSince
    ) {
      state.stopwatchWorkMs += Math.max(0, Date.now() - state.stopwatchRunningSince)
      state.stopwatchRunningSince = null
    }
  }

  clearAttribution() {
    this.state.bindingTaskId = null
    this.state.creditedMs = 0
  }

  clearStopwatchFields() {
    const state = this.state
    state.stopwatchWorkMs = 0
    state.stopwatchRunningSince = null
    state.stopwatchCreditedMs = 0
    state.stopwatchDisplayOffsetMs = 0
    state.savedPomodoroRemainingMs = null
    state.savedPomodoroDurationMs = null
    state.savedPomodoroPeriodType = null
  }

  addAccumulatedMs(taskId, ms) {
    if (!taskId || ms <= 0) return
    this.sessions.addAccumulatedMs(taskId, ms)
  }

  /**
   * Persiste el tramo aún no acreditado a la tarea vinculada al segmento actual.
   * @returns {number} ms acreditados en esta llamada
   */
  flushUncreditedSegment() {
    const state = this.state
    if (state.controlMode === 'stopwatch') {
      return this.flushStopwatchCredits()
    }
    if (state.periodType !== 'focus') return 0
    if (state.status !== 'running' && state.status !== 'paused') return 0

    const elapsed = this.currentElapsedMs()
    const uncredited = Math.max(0, elapsed - state.creditedMs)
    if (uncredited > 0 && state.bindingTaskId) {
      this.addAccumulatedMs(state.bindingTaskId, uncredited)
      state.creditedMs = elapsed
      TaskController.emitChanged()
    } else {
      state.creditedMs = elapsed
    }
    return uncredited
  }

  flushStopwatchCredits() {
    const state = this.state
    if (state.controlMode !== 'stopwatch') return 0
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

  /**
   * Tiempo ya dedicado a la tarea activa (BD + tramo no acreditado del periodo).
   */
  taskDedicatedMs() {
    const state = this.state
    const taskId = state.bindingTaskId || this.settings.getAll().active_task_id || null
    let base = this.taskAccumulatedMs(taskId)
    if (
      state.controlMode === 'pomodoro' &&
      state.periodType === 'focus' &&
      (state.status === 'running' || state.status === 'paused')
    ) {
      base += Math.max(0, this.currentElapsedMs() - state.creditedMs)
    }
    return base
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
    return state.stopwatchDisplayOffsetMs + this.currentStopwatchWorkMs()
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
      const state = this.state
      if (state.status !== 'running') return
      if (state.controlMode === 'stopwatch') {
        this.broadcast()
        return
      }
      if (!state.endsAt) return
      const remaining = state.endsAt - Date.now()
      if (remaining <= 0) {
        this.completePeriod()
      } else {
        state.remainingMs = remaining
        this.broadcast()
      }
    }, 500)
  }

  enterStopwatch() {
    const state = this.state
    if (state.controlMode === 'pomodoro' && state.status === 'running' && state.endsAt) {
      state.remainingMs = Math.max(0, state.endsAt - Date.now())
    }

    const wasRunning = state.status === 'running'
    const wasPaused = state.status === 'paused'
    const wasActive = wasRunning || wasPaused

    // Persistir tramo pomodoro pendiente antes de medir la base del cronómetro
    const dedicatedBefore = this.taskDedicatedMs()
    if (wasActive && state.periodType === 'focus') {
      this.flushUncreditedSegment()
    }

    const settings = this.settings.getAll()
    const focusDuration = this.durationFor('focus')
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
      this.startTick()
    } else if (wasPaused) {
      state.status = 'paused'
      state.stopwatchRunningSince = null
      this.stopTick()
    } else {
      state.status = 'idle'
      state.stopwatchRunningSince = null
      this.stopTick()
    }

    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  /**
   * Registra N sesiones de focus completadas durante el cronómetro.
   * El accumulated_ms ya se flusheó; solo incrementa contadores y filas de sesión.
   */
  recordFocusSessionsFromStopwatch(count, taskId, durationMs) {
    if (count <= 0) return
    const endedAt = new Date().toISOString()
    this.sessions.recordFocusSessions(count, {
      startedAt: this.state.startedAt || endedAt,
      endedAt,
      durationMs: Math.max(0, durationMs),
      taskId
    })

    for (let i = 0; i < count; i++) {
      this.streak.recordFocusCompletion(localDay())
      this.state.sessionInCycle += 1
      this.state.completedFocusToday += 1
    }
    TaskController.emitChanged()
  }

  enterPomodoroFromStopwatch() {
    this.freezeStopwatchWork()
    this.flushStopwatchCredits()

    const state = this.state
    const workMs = state.stopwatchWorkMs
    const remainingAtSwitch =
      state.savedPomodoroRemainingMs != null
        ? state.savedPomodoroRemainingMs
        : this.durationFor('focus')
    const focusDuration = this.durationFor('focus')
    const settings = this.settings.getAll()
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
      this.recordFocusSessionsFromStopwatch(sessionsCompleted, taskId, focusDuration)
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
    this.clearStopwatchFields()

    if (wasRunning && state.remainingMs > 0) {
      state.status = 'running'
      state.startedAt = new Date().toISOString()
      state.endsAt = Date.now() + state.remainingMs
      this.startTick()
    } else if (wasPaused && state.remainingMs > 0) {
      state.status = 'paused'
      this.stopTick()
    } else if (sessionsCompleted > 0 && state.remainingMs === focusDuration) {
      // Exactamente al límite de una sesión: dejar listo el siguiente pomodoro
      state.status = 'idle'
      state.startedAt = null
      state.creditedMs = 0
      this.stopTick()
      notifyPeriodComplete('focus')
    } else if (wasRunning || wasPaused) {
      state.status = 'paused'
      this.stopTick()
    } else {
      state.status = 'idle'
      state.startedAt = null
      state.creditedMs = 0
      this.stopTick()
    }

    this.broadcast()
    return { ok: true, data: this.getState() }
  }

  completePeriod() {
    const state = this.state
    if (state.controlMode === 'stopwatch') return

    this.stopTick()
    const endedAt = new Date().toISOString()
    const durationMs = state.durationMs
    const periodType = state.periodType
    const settings = this.settings.getAll()
    const taskId =
      periodType === 'focus'
        ? state.bindingTaskId || settings.active_task_id
        : null

    this.sessions.recordCompletedPeriod({
      periodType,
      startedAt: state.startedAt || endedAt,
      endedAt,
      durationMs,
      taskId,
      creditMs:
        periodType === 'focus' ? Math.max(0, durationMs - state.creditedMs) : 0
    })

    if (periodType === 'focus') {
      this.streak.recordFocusCompletion(localDay())
      state.sessionInCycle += 1
      state.completedFocusToday += 1
      TaskController.emitChanged()
    } else if (periodType === 'short_break') {
      state.completedShortBreakToday += 1
    } else if (periodType === 'long_break') {
      state.completedLongBreakToday += 1
    }

    notifyPeriodComplete(periodType)

    const untilLong = settings.pomodoros_until_long_break || 4
    let nextType = 'focus'
    if (periodType === 'focus') {
      nextType = state.sessionInCycle % untilLong === 0 ? 'long_break' : 'short_break'
    }

    const nextDuration = this.durationFor(nextType)
    this.state = {
      ...this.state,
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
    this.broadcast()
  }

  loadCompletedCountsToday() {
    const counts = this.sessions.countCompletedByType(localDay())
    const state = this.state
    state.completedFocusToday = counts.focus
    state.completedShortBreakToday = counts.short_break
    state.completedLongBreakToday = counts.long_break
    state.sessionInCycle =
      counts.focus % (this.settings.getAll().pomodoros_until_long_break || 4)
  }

  writeSnapshot() {
    const state = this.state
    if (state.status === 'idle') {
      this.sessions.clearSnapshot()
      return
    }

    this.sessions.writeSnapshot(
      JSON.stringify({
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
    )
  }

  /**
   * Restaura un pomodoro en pausa guardado al cerrar la app.
   * Siempre vuelve como paused (nunca running) para que el usuario reanude a mano.
   * @returns {boolean}
   */
  restoreSnapshot() {
    const raw = this.sessions.readSnapshot()
    if (!raw) return false

    let snap
    try {
      snap = JSON.parse(raw)
    } catch {
      this.sessions.clearSnapshot()
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
    const wasActive = snap.status === 'paused' || snap.status === 'running'
    const sessionInCycle = Number.isFinite(Number(snap.sessionInCycle))
      ? Number(snap.sessionInCycle)
      : this.state.sessionInCycle
    const bindingTaskId =
      snap.bindingTaskId != null ? Number(snap.bindingTaskId) : null

    if (controlMode === 'stopwatch') {
      if (!wasActive) {
        this.sessions.clearSnapshot()
        return false
      }
      this.state = {
        ...this.state,
        status: 'paused',
        controlMode: 'stopwatch',
        periodType: 'focus',
        remainingMs,
        durationMs: durationMs || this.durationFor('focus'),
        endsAt: null,
        startedAt: snap.startedAt || null,
        bindingTaskId,
        creditedMs: Math.max(0, Number(snap.creditedMs) || 0),
        sessionInCycle,
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
      this.sessions.clearSnapshot()
      return true
    }

    if (!wasActive || !validType || remainingMs <= 0 || durationMs <= 0) {
      this.sessions.clearSnapshot()
      return false
    }

    this.state = {
      ...this.state,
      status: 'paused',
      controlMode: 'pomodoro',
      periodType,
      remainingMs,
      durationMs,
      endsAt: null,
      startedAt: snap.startedAt || null,
      bindingTaskId,
      creditedMs: Math.max(0, Number(snap.creditedMs) || 0),
      sessionInCycle
    }
    this.clearStopwatchFields()
    this.sessions.clearSnapshot()
    return true
  }
}

module.exports = new TimerController()
