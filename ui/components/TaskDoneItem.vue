<template>
  <button type="button" class="flex items-start gap-3 p-3 rounded-xl opacity-50 hover:opacity-75 transition-opacity bg-surface-container/40 text-left w-full cursor-pointer">
    <div class="mt-0.5 flex-shrink-0" @click.stop>
      <TaskStatusMenu :task-id="task.id" :status="task.status" />
    </div>
    <div class="flex-1 min-w-0">
      <span class="font-body-md line-through truncate text-on-surface-variant block">{{ task.title }}</span>
      <div class="flex items-center gap-2 mt-1 text-on-surface-variant font-label-mono-sm">
        <span v-if="task.tags[0]" class="px-1.5 py-0.5 rounded bg-surface-container text-outline">{{ task.tags[0] }}</span>
        <span class="px-1.5 py-0.5 rounded-full bg-white/5 text-on-surface-variant text-[10px]">P: {{ Number(task.priority_score || 0).toFixed(1) }}</span>
        <span v-if="task.due_date">·</span>
        <span v-if="task.due_date">{{ formatDueDate(task.due_date) }}</span>
        <span>·</span>
        <span :class="task.id === activeTaskId ? 'text-primary' : ''">{{ formatAccumulated(accumulatedMs) }}</span>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer.store'
import { formatAccumulated } from '@/lib/format-accumulated'
import TaskStatusMenu from '@/components/TaskStatusMenu.vue'

const props = defineProps({
  task: { type: Object, required: true },
  activeTaskId: { type: [Number, String], default: null }
})

const timer = useTimerStore()
const accumulatedMs = computed(() => {
  const base = props.task.accumulated_ms || 0
  const bindingId = timer.state.bindingTaskId
  return bindingId != null && Number(props.task.id) === Number(bindingId) ? base + timer.segmentElapsedMs : base
})

function formatDueDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}` : iso
}
</script>
