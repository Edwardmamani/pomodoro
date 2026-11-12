<template>
  <div class="h-full w-full flex flex-col items-center justify-center min-h-0 px-2">
    <div class="relative flex items-center justify-center my-auto">
      <div class="w-[340px] h-[340px] relative flex items-center justify-center">
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 340 340">
          <circle class="stroke-[#242426]" cx="170" cy="170" fill="transparent" r="148" stroke-width="3" />
          <circle class="stroke-white/10" cx="170" cy="170" fill="transparent" r="138" stroke-dasharray="2 10" stroke-width="1.5" />
          <circle
            class="transition-all duration-300 ease-linear"
            :class="timer.isRunning ? 'stroke-primary' : (timer.isPaused ? 'stroke-secondary' : 'stroke-white/20')"
            cx="170" cy="170" fill="transparent" r="148"
            :stroke-dasharray="circumference" :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round" stroke-width="4"
          />
        </svg>

        <div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <div class="flex items-center gap-1.5 mb-2 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-on-surface-variant backdrop-blur-md">
            <span class="w-1.5 h-1.5 rounded-full" :class="timer.isRunning ? 'bg-tertiary animate-pulse' : (timer.isPaused ? 'bg-secondary' : 'bg-outline')"></span>
            <span class="font-label-mono-sm uppercase tracking-wider text-[11px] font-medium">{{ statusLabel }}</span>
          </div>
          <span class="apple-timer-digits text-white font-extralight tracking-tight" :class="{ 'apple-timer-digits--long': isLongDisplay }">{{ display }}</span>
          <div class="flex items-center gap-2 mt-2 text-on-surface-variant">
            <span class="font-label-mono text-on-surface-variant/80 text-[11px]">{{ timer.state.completedFocusToday }} ENFOQUES HOY</span>
          </div>
        </div>
      </div>
    </div>
    <StopwatchControls />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer.store'
import StopwatchControls from './StopwatchControls.vue'

const timer = useTimerStore()
const circumference = computed(() => 2 * Math.PI * 148)
const strokeDashoffset = computed(() => circumference.value * (1 - (timer.state.progress || 0)))
const display = computed(() => timer.state.display || '00:00')
const isLongDisplay = computed(() => String(display.value || '').length > 5)
const statusLabel = computed(() => (timer.isRunning ? 'EN CURSO' : (timer.isPaused ? 'EN PAUSA' : 'LISTO')))
</script>

<style scoped>
.apple-timer-digits {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-size: 80px; line-height: 86px; letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums; max-width: 290px; overflow: hidden; white-space: nowrap;
}
.apple-timer-digits--long { font-size: 52px; line-height: 58px; letter-spacing: -0.03em; }
</style>
