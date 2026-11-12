<template>
  <button
    type="button"
    class="inline-flex items-center gap-0.5 relative cursor-pointer"
    :class="task.due_date ? ['px-1.5 py-0.5 rounded bg-surface-container', dueDateClass] : 'text-outline hover:text-on-surface-variant'"
    :title="task.due_date ? 'Finaliza ' + task.due_date : 'Sin fecha'"
    @click.stop="openDatePicker"
  >
    <span class="material-symbols-outlined text-[11px] pointer-events-none">event</span>
    <span v-if="task.due_date" class="pointer-events-none">{{ TaskCardHelper.formatDueDate(task.due_date) }}</span>
    <input
      ref="dueDateInput"
      class="absolute left-0 top-0 w-full h-full opacity-0 pointer-events-none"
      type="date"
      tabindex="-1"
      :value="task.due_date || ''"
      @change="onDateChange($event.target.value)"
    />
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { TaskCardHelper } from '@/lib/task-card-helper'

const props = defineProps({ task: { type: Object, required: true } })
const emit = defineEmits(['save'])

const dueDateInput = ref(null)
const dueDateClass = computed(() => TaskCardHelper.dueDateClass(props.task))

async function openDatePicker() {
  const input = dueDateInput.value
  if (!input) return
  try {
    if (typeof input.showPicker === 'function') {
      await input.showPicker()
      return
    }
  } catch { /* fallback abajo */ }
  input.focus()
  input.click()
}

function onDateChange(value) {
  const due_date = value || null
  if ((due_date || '') === (props.task.due_date || '')) return
  emit('save', due_date)
}
</script>
