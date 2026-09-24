<template>
  <main
    class="col-span-9 bg-surface p-6 overflow-y-auto flex flex-col items-center justify-between border-r border-outline-variant/30"
  >
    <div
      class="inline-flex items-center p-1 bg-surface-container-low rounded-full shadow-sm mt-2"
    >
      <button
        type="button"
        class="flex items-center gap-2 px-5 py-2 rounded-full transition-all"
        :class="
          periodType === 'focus'
            ? 'bg-surface-container-high text-on-surface shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        @click="onMode('focus')"
      >
        <span
          v-if="periodType === 'focus'"
          class="w-2 h-2 rounded-full bg-primary"
        ></span>
        <span class="font-label-md">Concentración</span>
        <span
          class="font-label-mono-sm px-1.5 py-0.5 rounded-full"
          :class="
            periodType === 'focus'
              ? 'bg-primary/20 text-primary'
              : 'bg-surface-container-highest text-on-surface-variant'
          "
          >{{ timer.state.completedFocusToday }}</span
        >
      </button>
      <button
        type="button"
        class="flex items-center gap-2 px-5 py-2 rounded-full transition-colors"
        :class="
          periodType === 'short_break'
            ? 'bg-surface-container-high text-on-surface shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        @click="onMode('short_break')"
      >
        <span class="font-label-md">Descanso corto</span>
      </button>
      <button
        type="button"
        class="flex items-center gap-2 px-5 py-2 rounded-full transition-colors"
        :class="
          periodType === 'long_break'
            ? 'bg-surface-container-high text-on-surface shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        @click="onMode('long_break')"
      >
        <span class="font-label-md">Descanso largo</span>
      </button>
    </div>

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
              >spa</span
            >
            <span class="font-label-mono-sm uppercase tracking-wider"
              >Flujo Intencional</span
            >
          </div>
          <span
            class="font-display-timer text-on-surface font-light tracking-tighter tabular-nums"
            >{{ timer.state.display }}</span
          >
          <div class="flex items-center gap-2 mt-1 text-on-surface-variant">
            <span class="font-label-mono text-outline"
              >SESIÓN
              {{ String(sessionNum).padStart(2, '0') }} DE
              {{ String(untilLong).padStart(2, '0') }}</span
            >
            <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span class="font-label-mono text-primary">{{ statusLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4 my-2">
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-95 shadow-sm"
        title="Reiniciar Pomodoro"
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
        title="Detener y Guardar Sesión"
        @click="timer.stop()"
      >
        <span class="material-symbols-outlined text-[20px]">stop</span>
      </button>
    </div>

    <div
      class="flex items-center justify-between px-5 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs shadow-sm max-w-md w-full mb-2"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="tasks.activeTask ? 'bg-primary animate-pulse' : 'bg-outline'"
        ></span>
        <span class="font-label-md text-on-surface truncate">{{
          tasks.activeTask?.title || 'Sin tarea activa'
        }}</span>
        <template v-if="tasks.activeTask?.tags?.length">
          <span class="font-label-mono-sm text-outline hidden sm:inline"
            >·</span
          >
          <span
            class="font-label-mono-sm text-on-surface-variant hidden sm:inline truncate"
            >{{ tasks.activeTask.tags[0] }}</span
          >
        </template>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <span
          v-if="tasks.activeTask"
          class="font-label-mono-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full"
          >{{ tasks.activeTask.completed_pomodoros }}/{{
            tasks.activeTask.estimated_pomodoros || 0
          }}
          pomos</span
        >
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '../stores/timer.store'
import { useTasksStore } from '../stores/tasks.store'
import { useSettingsStore } from '../stores/settings.store'

const timer = useTimerStore()
const tasks = useTasksStore()
const settings = useSettingsStore()

const periodType = computed(() => timer.state.periodType)
const circumference = computed(() => timer.state.circumference || 867)
const strokeDashoffset = computed(() => {
  const c = circumference.value
  const p = timer.state.progress || 0
  return c * (1 - p)
})

const untilLong = computed(
  () => settings.settings.pomodoros_until_long_break || 4
)
const sessionNum = computed(() => {
  const n = (timer.state.sessionInCycle % untilLong.value) + 1
  return n
})

const statusLabel = computed(() => {
  if (timer.isRunning) {
    if (periodType.value === 'focus') return 'ENFOQUE ACTIVO'
    return 'DESCANSO'
  }
  if (timer.isPaused) return 'EN PAUSA'
  return 'LISTO'
})

const toggleIcon = computed(() => (timer.isRunning ? 'pause' : 'play_arrow'))
const toggleLabel = computed(() => {
  if (timer.isRunning) return 'Pausar'
  if (timer.isPaused) return 'Reanudar'
  return 'Iniciar'
})

async function onMode(type) {
  await timer.setMode(type)
}
</script>
