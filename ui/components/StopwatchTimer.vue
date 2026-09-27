<template>
  <div
    class="h-full w-full flex flex-col items-center justify-between min-h-0 px-1"
  >
    <div
      class="mt-1 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant"
    >
      <span
        class="w-2 h-2 rounded-full bg-primary"
        :class="{ 'animate-pulse': timer.isRunning }"
      ></span>
      <span class="font-label-md">Concentración libre</span>
      <span
        class="font-label-mono-sm px-1.5 py-0.5 rounded-full bg-primary/20 text-primary"
        >{{ timer.state.completedFocusToday }}</span
      >
    </div>

    <!-- Ring -->
    <div class="relative flex items-center justify-center my-4">
      <div class="w-[320px] h-[320px] relative flex items-center justify-center">
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 320 320">
          <circle
            class="stroke-surface-container-high"
            cx="160"
            cy="160"
            fill="transparent"
            r="138"
            stroke-width="3"
          />
          <circle
            class="text-outline-variant/30"
            cx="160"
            cy="160"
            fill="transparent"
            r="126"
            stroke="currentColor"
            stroke-dasharray="2 12"
            stroke-width="1"
          />
          <circle
            class="stroke-primary transition-all duration-700 ease-out"
            cx="160"
            cy="160"
            fill="transparent"
            r="138"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round"
            stroke-width="4.5"
          />
        </svg>
        <div
          class="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <div
            class="flex items-center gap-1.5 mb-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant"
          >
            <span
              class="material-symbols-outlined text-[14px] text-primary"
              style="font-variation-settings: 'FILL' 1"
              >timer</span
            >
            <span class="font-label-mono-sm uppercase tracking-wider"
              >Cronómetro</span
            >
          </div>
          <span
            class="font-display-timer text-on-surface font-light tracking-tighter tabular-nums"
            >{{ display }}</span
          >
          <div class="flex items-center gap-2 mt-1 text-on-surface-variant">
            <span class="font-label-mono text-outline"
              >{{ timer.state.completedFocusToday }} FOCUS HOY</span
            >
            <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span class="font-label-mono text-primary">{{ statusLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-4 my-2">
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-95 shadow-sm"
        title="Reiniciar cronómetro"
        @click="timer.reset()"
      >
        <span class="material-symbols-outlined text-[20px]">restart_alt</span>
      </button>
      <button
        type="button"
        class="h-12 px-8 flex items-center gap-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-md hover:bg-primary-fixed-dim transition-all"
        @click="timer.toggle()"
      >
        <span
          class="material-symbols-outlined text-[20px]"
          style="font-variation-settings: 'FILL' 1"
          >{{ toggleIcon }}</span
        >
        <span>{{ toggleLabel }}</span>
      </button>
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-all active:scale-95 shadow-sm"
        title="Detener cronómetro"
        @click="timer.stop()"
      >
        <span class="material-symbols-outlined text-[20px]">stop</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '../stores/timer.store'

const timer = useTimerStore()

const circumference = computed(() => timer.state.circumference || 867)
const strokeDashoffset = computed(() => {
  const c = circumference.value
  if (!timer.isStopwatch) {
    return c
  }
  const p = timer.state.progress || 0
  return c * (1 - p)
})

function formatElapsed(ms) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const display = computed(() => {
  if (timer.isStopwatch) return timer.state.display
  // Panel fuera de vista en modo pomodoro
  return formatElapsed(timer.state.elapsedMs || 0)
})

const statusLabel = computed(() => {
  if (timer.isRunning) return 'CRONÓMETRO'
  if (timer.isPaused) return 'EN PAUSA'
  return 'LISTO'
})

const toggleIcon = computed(() => (timer.isRunning ? 'pause' : 'play_arrow'))
const toggleLabel = computed(() => {
  if (timer.isRunning) return 'Pausar'
  if (timer.isPaused) return 'Reanudar'
  return 'Iniciar'
})
</script>
