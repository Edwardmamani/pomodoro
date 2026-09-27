<template>
  <main
    class="h-full w-full bg-surface p-6 overflow-hidden flex flex-col items-center"
  >
    <!-- Control mode slider: Pomodoro / Cronómetro -->
    <div
      class="relative inline-flex items-center p-1 bg-surface-container-low rounded-full shadow-sm mt-2 w-[280px] flex-shrink-0 z-10"
      role="tablist"
      aria-label="Modo de control del tiempo"
    >
      <span
        class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-surface-container-high shadow-sm transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :style="{
          transform: isStopwatch ? 'translateX(calc(100% + 4px))' : 'translateX(0)'
        }"
        aria-hidden="true"
      ></span>
      <button
        type="button"
        role="tab"
        class="relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full transition-colors"
        :class="
          !isStopwatch
            ? 'text-on-surface'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        :aria-selected="!isStopwatch"
        @click="onControlMode('pomodoro')"
      >
        <span class="font-label-md">Pomodoro</span>
      </button>
      <button
        type="button"
        role="tab"
        class="relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full transition-colors"
        :class="
          isStopwatch
            ? 'text-on-surface'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        :aria-selected="isStopwatch"
        @click="onControlMode('stopwatch')"
      >
        <span class="font-label-md">Cronómetro</span>
      </button>
    </div>

    <!-- Sliding panels (carrusel horizontal) -->
    <div class="relative w-full flex-1 min-h-0 mt-3 overflow-hidden">
      <div
        class="flex h-full w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        :style="{
          transform: isStopwatch ? 'translateX(-50%)' : 'translateX(0)'
        }"
      >
        <section
          class="w-1/2 h-full flex-shrink-0 overflow-y-auto"
          :class="{ 'pointer-events-none': isStopwatch }"
          :aria-hidden="isStopwatch"
        >
          <PomodoroTimer />
        </section>
        <section
          class="w-1/2 h-full flex-shrink-0 overflow-y-auto"
          :class="{ 'pointer-events-none': !isStopwatch }"
          :aria-hidden="!isStopwatch"
        >
          <StopwatchTimer />
        </section>
      </div>
    </div>

    <!-- Active task (compartido) -->
    <div
      class="flex items-center justify-between px-5 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs shadow-sm max-w-md w-full mb-2 mt-2 flex-shrink-0"
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
import PomodoroTimer from './PomodoroTimer.vue'
import StopwatchTimer from './StopwatchTimer.vue'

const timer = useTimerStore()
const tasks = useTasksStore()

const isStopwatch = computed(() => timer.isStopwatch)

async function onControlMode(mode) {
  if (
    (mode === 'stopwatch' && isStopwatch.value) ||
    (mode === 'pomodoro' && !isStopwatch.value)
  ) {
    return
  }
  await timer.setControlMode(mode)
}
</script>
