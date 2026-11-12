<template>
  <div class="flex items-center justify-center gap-8 mt-4 mb-2">
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

    <button
      type="button"
      class="w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg border cursor-pointer"
      :class="toggleButtonClasses"
      @click="timer.toggle()"
    >
      <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1">{{ toggleIcon }}</span>
      <span class="text-[11px] font-label-md mt-0.5 font-semibold">{{ toggleLabel }}</span>
    </button>

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
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer.store'

const timer = useTimerStore()
const toggleIcon = computed(() => (timer.isRunning ? 'pause' : 'play_arrow'))
const toggleLabel = computed(() => (timer.isRunning ? 'Pausar' : (timer.isPaused ? 'Reanudar' : 'Iniciar')))
const toggleButtonClasses = computed(() =>
  timer.isRunning
    ? 'bg-[#3b2308] text-[#FF9F0A] border-[#FF9F0A]/40 hover:bg-[#4d2e0a]'
    : 'bg-[#10301a] text-[#30D158] border-[#30D158]/40 hover:bg-[#153f22]'
)
</script>
