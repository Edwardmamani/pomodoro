<template>
  <div
    class="h-full w-full flex flex-col items-center justify-center min-h-0 px-2"
  >
    <!-- Apple Watch / iOS Stopwatch Dial -->
    <div class="relative flex items-center justify-center my-auto">
      <div class="w-[340px] h-[340px] relative flex items-center justify-center">
        <!-- SVG Ring -->
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 340 340">
          <!-- Background track -->
          <circle
            class="stroke-[#242426]"
            cx="170"
            cy="170"
            fill="transparent"
            r="148"
            stroke-width="3"
          />
          <!-- Subtle tick dashes -->
          <circle
            class="stroke-white/10"
            cx="170"
            cy="170"
            fill="transparent"
            r="138"
            stroke-dasharray="2 10"
            stroke-width="1.5"
          />
          <!-- Active glowing progress arc -->
          <circle
            class="transition-all duration-300 ease-linear"
            :class="timer.isRunning ? 'stroke-primary' : (timer.isPaused ? 'stroke-secondary' : 'stroke-white/20')"
            cx="170"
            cy="170"
            fill="transparent"
            r="148"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round"
            stroke-width="4"
          />
        </svg>

        <!-- Dial Content -->
        <div
          class="absolute inset-0 flex flex-col items-center justify-center text-center select-none"
        >
          <!-- State Pill -->
          <div
            class="flex items-center gap-1.5 mb-2 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-on-surface-variant backdrop-blur-md"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="timer.isRunning ? 'bg-tertiary animate-pulse' : (timer.isPaused ? 'bg-secondary' : 'bg-outline')"
            ></span>
            <span class="font-label-mono-sm uppercase tracking-wider text-[11px] font-medium"
              >{{ statusLabel }}</span
            >
          </div>

          <!-- Giant Digits -->
          <span
            class="apple-timer-digits text-white font-extralight tracking-tight"
            :class="{ 'apple-timer-digits--long': isLongDisplay }"
          >{{ display }}</span>

          <div class="flex items-center gap-2 mt-2 text-on-surface-variant">
            <span class="font-label-mono text-on-surface-variant/80 text-[11px]"
              >{{ timer.state.completedFocusToday }} ENFOQUES HOY</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Apple iOS / watchOS Circular Controls -->
    <div class="flex items-center justify-center gap-8 mt-4 mb-2">
      <!-- Reset / Stop Button -->
      <button
        type="button"
        class="w-16 h-16 rounded-full flex flex-col items-center justify-center bg-[#2c2c2e] text-[#aeaeb2] border border-white/10 hover:bg-[#3a3a3c] hover:text-white transition-all active:scale-95 shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        :disabled="timer.state.status === 'idle'"
        title="Reiniciar a cero"
        @click="timer.reset()"
      >
        <span class="material-symbols-outlined text-[22px]">restart_alt</span>
        <span class="text-[10px] font-label-md mt-0.5 font-medium">Reiniciar</span>
      </button>

      <!-- Main Play / Pause Button -->
      <button
        type="button"
        class="w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg border cursor-pointer"
        :class="toggleButtonClasses"
        @click="timer.toggle()"
      >
        <span
          class="material-symbols-outlined text-[28px]"
          style="font-variation-settings: 'FILL' 1"
        >{{ toggleIcon }}</span>
        <span class="text-[11px] font-label-md mt-0.5 font-semibold">{{ toggleLabel }}</span>
      </button>

      <!-- Stop & Save Session Button -->
      <button
        type="button"
        class="w-16 h-16 rounded-full flex flex-col items-center justify-center bg-[#2c2c2e] text-[#aeaeb2] border border-white/10 hover:bg-[#3a3a3c] hover:text-error transition-all active:scale-95 shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        :disabled="timer.state.status === 'idle'"
        title="Detener y guardar tiempo"
        @click="timer.stop()"
      >
        <span class="material-symbols-outlined text-[22px]">stop</span>
        <span class="text-[10px] font-label-md mt-0.5 font-medium">Detener</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer.store'

const timer = useTimerStore()

const circumference = computed(() => 2 * Math.PI * 148) // 930
const strokeDashoffset = computed(() => {
  const c = circumference.value
  const p = timer.state.progress || 0
  return c * (1 - p)
})

const display = computed(() => timer.state.display || '00:00')
const isLongDisplay = computed(() => String(display.value || '').length > 5)

const statusLabel = computed(() => {
  if (timer.isRunning) return 'EN CURSO'
  if (timer.isPaused) return 'EN PAUSA'
  return 'LISTO'
})

const toggleIcon = computed(() => (timer.isRunning ? 'pause' : 'play_arrow'))
const toggleLabel = computed(() => {
  if (timer.isRunning) return 'Pausar'
  if (timer.isPaused) return 'Reanudar'
  return 'Iniciar'
})

const toggleButtonClasses = computed(() => {
  if (timer.isRunning) {
    return 'bg-[#3b2308] text-[#FF9F0A] border-[#FF9F0A]/40 hover:bg-[#4d2e0a]'
  }
  return 'bg-[#10301a] text-[#30D158] border-[#30D158]/40 hover:bg-[#153f22]'
})
</script>

<style scoped>
.apple-timer-digits {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-size: 80px;
  line-height: 86px;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  max-width: 290px;
  overflow: hidden;
  white-space: nowrap;
}

.apple-timer-digits--long {
  font-size: 52px;
  line-height: 58px;
  letter-spacing: -0.03em;
}
</style>

