import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTimerStore = defineStore('timer', () => {
  const state = ref({
    status: 'idle',
    periodType: 'focus',
    remainingMs: 25 * 60 * 1000,
    durationMs: 25 * 60 * 1000,
    display: '25:00',
    progress: 0,
    strokeDashoffset: 867,
    circumference: 867,
    sessionInCycle: 0,
    completedFocusToday: 0
  })

  let unsub = null

  const isRunning = computed(() => state.value.status === 'running')
  const isPaused = computed(() => state.value.status === 'paused')

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

  async function setMode(periodType) {
    return window.pomodoroAPI.timer.setMode(periodType)
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
    refresh,
    subscribe,
    start,
    pause,
    resume,
    reset,
    stop,
    setMode,
    toggle
  }
})
