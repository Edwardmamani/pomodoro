<template>
  <div
    class="h-full w-full flex flex-col items-center justify-between min-h-0 px-1"
  >
    <!-- Period modes -->
    <div
      class="inline-flex items-center p-1 bg-surface-container-low rounded-full shadow-sm mt-1"
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
        <span
          v-if="periodType === 'short_break'"
          class="w-2 h-2 rounded-full bg-primary"
        ></span>
        <span class="font-label-md">Descanso corto</span>
        <span
          class="font-label-mono-sm px-1.5 py-0.5 rounded-full"
          :class="
            periodType === 'short_break'
              ? 'bg-primary/20 text-primary'
              : 'bg-surface-container-highest text-on-surface-variant'
          "
          >{{ timer.state.completedShortBreakToday }}</span
        >
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
        <span
          v-if="periodType === 'long_break'"
          class="w-2 h-2 rounded-full bg-primary"
        ></span>
        <span class="font-label-md">Descanso largo</span>
        <span
          class="font-label-mono-sm px-1.5 py-0.5 rounded-full"
          :class="
            periodType === 'long_break'
              ? 'bg-primary/20 text-primary'
              : 'bg-surface-container-highest text-on-surface-variant'
          "
          >{{ timer.state.completedLongBreakToday }}</span
        >
      </button>
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
              >spa</span
            >
            <span class="font-label-mono-sm uppercase tracking-wider"
              >Flujo Intencional</span
            >
          </div>
          <span
            class="font-display-timer text-on-surface font-light tracking-tighter tabular-nums"
            >{{ display }}</span
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

    <!-- Controls -->
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

    <ConfirmModal
      v-model:open="confirmOpen"
      title="¿Cambiar de modo?"
      :message="confirmMessage"
      confirm-label="Cambiar modo"
      cancel-label="Seguir así"
      @confirm="confirmModeChange"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTimerStore } from '../stores/timer.store'
import { useSettingsStore } from '../stores/settings.store'
import ConfirmModal from './ConfirmModal.vue'

const timer = useTimerStore()
const settings = useSettingsStore()

const confirmOpen = ref(false)
const pendingMode = ref(null)

const MODE_LABELS = {
  focus: 'Concentración',
  short_break: 'Descanso corto',
  long_break: 'Descanso largo'
}

const periodType = computed(() => timer.state.periodType)
const circumference = computed(() => timer.state.circumference || 867)
const strokeDashoffset = computed(() => {
  if (timer.isStopwatch) {
    // Panel fuera de vista: anillo según remanente pomodoro guardado
    const rem = timer.state.remainingMs || 0
    const dur = timer.state.durationMs || 1
    const p = dur > 0 ? 1 - rem / dur : 0
    return circumference.value * (1 - p)
  }
  const c = circumference.value
  const p = timer.state.progress || 0
  return c * (1 - p)
})

function formatCountdown(ms) {
  const totalSec = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const display = computed(() => {
  if (timer.isStopwatch) {
    return formatCountdown(timer.state.remainingMs || 0)
  }
  return timer.state.display
})

const untilLong = computed(
  () => settings.settings.pomodoros_until_long_break || 4
)
const sessionNum = computed(() => {
  return (timer.state.sessionInCycle % untilLong.value) + 1
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

const confirmMessage = computed(() => {
  const next = MODE_LABELS[pendingMode.value] || 'otro modo'
  const stateLabel = timer.isPaused ? 'en pausa' : 'en marcha'
  return `El temporizador está ${stateLabel}. Al cambiar a ${next}, el tiempo se restablecerá a la duración de ese modo y el periodo actual no se guardará como completado.`
})

async function onMode(type) {
  if (type === periodType.value) return
  if (timer.isRunning || timer.isPaused) {
    pendingMode.value = type
    confirmOpen.value = true
    return
  }
  await timer.setMode(type)
}

async function confirmModeChange() {
  const type = pendingMode.value
  pendingMode.value = null
  if (!type) return
  await timer.setMode(type, { force: true })
}
</script>
