<template>
  <main
    class="h-full w-full bg-surface p-6 overflow-hidden flex flex-col items-center justify-between"
  >
    <!-- Header visual / Mode indicator -->
    <div
      class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-xs text-on-surface-variant mt-1"
    >
      <span
        class="w-2 h-2 rounded-full"
        :class="timer.isRunning ? 'bg-tertiary animate-pulse' : (timer.isPaused ? 'bg-secondary' : 'bg-outline')"
      ></span>
      <span class="font-label-md font-medium tracking-wide">Cronómetro de Enfoque</span>
    </div>

    <!-- Stopwatch Stage Area -->
    <div class="relative w-full flex-1 min-h-0 flex items-center justify-center my-2">
      <StopwatchTimer />
    </div>

    <!-- Active task card (Apple HIG style) -->
    <div
      class="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-surface-container border border-outline-variant shadow-sm max-w-md w-full mb-2 flex-shrink-0 transition-all hover:bg-surface-container-high"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="tasks.activeTask ? (timer.isRunning ? 'bg-primary animate-pulse' : 'bg-primary') : 'bg-outline'"
        ></span>
        <div class="flex flex-col min-w-0">
          <span class="font-label-md text-on-surface truncate leading-tight">
            {{ tasks.activeTask?.title || 'Sin tarea activa' }}
          </span>
          <span v-if="tasks.activeTask?.tags?.length" class="font-label-mono-sm text-on-surface-variant truncate">
            {{ tasks.activeTask.tags.join(', ') }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span
          v-if="tasks.activeTask"
          class="font-label-mono-sm px-2 py-0.5 rounded-full font-medium"
          :class="priorityBadgeClass(tasks.activeTask.priority_score)"
          title="Puntaje de prioridad P = ((I×U) + (D×R)) / E"
        >
          P: {{ Number(tasks.activeTask.priority_score).toFixed(1) }}
        </span>
        <span
          v-if="tasks.activeTask"
          class="font-label-mono-sm text-primary bg-primary-container/30 px-2.5 py-0.5 rounded-full font-medium"
        >
          {{ formatAccumulated(tasks.displayAccumulatedMs(tasks.activeTask)) }}
        </span>
      </div>
    </div>
  </main>
</template>

<script setup>
import { useTimerStore } from '@/stores/timer.store'
import { useTasksStore } from '@/stores/tasks.store'
import { formatAccumulated } from '@/lib/format-accumulated'
import StopwatchTimer from '@/components/StopwatchTimer.vue'

const timer = useTimerStore()
const tasks = useTasksStore()

function priorityBadgeClass(score) {
  const s = Number(score) || 0
  if (s >= 12) return 'bg-error/15 text-error border border-error/30'
  if (s >= 6) return 'bg-secondary/15 text-secondary border border-secondary/30'
  if (s >= 3) return 'bg-primary/15 text-primary border border-primary/30'
  return 'bg-surface-container-highest text-on-surface-variant border border-outline/30'
}
</script>

