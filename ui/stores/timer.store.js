import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTimerStore = defineStore('timer', () => {
  const state = ref({
    status: 'idle',
    controlMode: 'stopwatch',
    periodType: 'stopwatch',
    remainingMs: 0,
    durationMs: 0,
    elapsedMs: 0,
    segmentElapsedMs: 0,
    sessionElapsedMs: 0,
    bindingTaskId: null,
    creditedMs: 0,
    display: '00:00',
    progress: 0,
    strokeDashoffset: 867,
    circumference: 867,
    completedFocusToday: 0
  })

  let unsub = null

  const isRunning = computed(() => state.value.status === 'running')
  const isPaused = computed(() => state.value.status === 'paused')
  const isStopwatch = computed(() => true)

  /** Ms del tramo actual de cronómetro aún no persistidos */
  const segmentElapsedMs = computed(() => {
    return Math.max(0, state.value.segmentElapsedMs || 0)
  })

  /** @deprecated usar segmentElapsedMs; se mantiene por compatibilidad */
  const focusElapsedMs = segmentElapsedMs

  async function refresh() {
    const res = await window.pomodoroAPI.timer.get()
    if (res.ok) state.value = { ...state.value, ...res.data }
  }

  function subscribe() {
    unsub?.()
    unsub = window.pomodoroAPI.timer.onState((s) => {
      state.value = { ...state.value, ...s }
    })
  }

  async function start() {
    return window.pomodoroAPI.timer.start()
  }

  async function pause() {
    return window.pomodoroAPI.timer.pause()
  }

  async function resume() {
    return window.pomodoroAPI.timer.resume()
  }

  async function reset() {
    return window.pomodoroAPI.timer.reset()
  }

  async function stop() {
    return window.pomodoroAPI.timer.stop()
  }

  async function setMode(periodType, opts) {
    const res = await window.pomodoroAPI.timer.setMode(periodType, opts)
    if (res?.ok && res.data) {
      state.value = { ...state.value, ...res.data }
    }
    return res
  }

  async function setControlMode(controlMode) {
    const res = await window.pomodoroAPI.timer.setControlMode(controlMode)
    if (res?.ok && res.data) {
      state.value = { ...state.value, ...res.data }
    }
    return res
  }

  async function toggle() {
    if (isRunning.value) return pause()
    if (isPaused.value) return resume()
    return start()
  }

  return {
    state,
    isRunning,
    isPaused,
    isStopwatch,
    focusElapsedMs,
    segmentElapsedMs,
    refresh,
    subscribe,
    start,
    pause,
    resume,
    reset,
    stop,
    setMode,
    setControlMode,
    toggle
  }
})
