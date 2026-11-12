<template>
  <div
    class="relative rounded-xl p-3 transition-all w-full"
    :class="[isActive ? 'bg-surface-container-high text-on-surface shadow-sm' : 'hover:bg-surface-container', navigateOnSelect ? 'cursor-pointer' : '']"
    :role="navigateOnSelect ? 'button' : undefined"
    :tabindex="navigateOnSelect ? 0 : undefined"
    @click="navigateOnSelect && emit('select', task.id)"
    @keydown.enter.prevent="navigateOnSelect && emit('select', task.id)"
  >
    <div class="flex items-start gap-3">
      <div class="mt-0.5 flex-shrink-0" @click.stop><TaskStatusMenu :task-id="task.id" :status="task.status" /></div>
      <div class="flex-1 min-w-0 pr-8">
        <div class="flex items-center justify-between gap-1">
          <input
            v-model="titleDraft"
            type="text"
            maxlength="200"
            class="flex-1 min-w-0 bg-transparent border-0 p-0 truncate text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 cursor-text"
            :class="isActive ? 'font-label-md' : 'font-body-md'"
            placeholder="Título"
            @click.stop
            @focus="titleFocused = true"
            @blur="saveTitle"
            @keydown.enter.prevent="blurActive"
          />
          <div @click.stop><TaskPriorityMenu :task-id="task.id" :task="task" /></div>
        </div>
        <div class="flex items-center gap-2 mt-1.5 text-on-surface-variant font-label-mono-sm flex-wrap">
          <TaskInlineTags :tags="task.tags || []" @update="(tags) => tasks.update(task.id, { tags })" />
          <TaskDueDateChip :task="task" @save="(due_date) => tasks.update(task.id, { due_date })" />
          <span class="pointer-events-none">·</span>
          <span class="inline-flex items-center gap-1 font-label-mono-sm font-medium" :class="isActive ? 'text-primary' : 'text-on-surface-variant'" title="Tiempo acumulado de concentración">
            <span class="material-symbols-outlined text-[13px]">timer</span>
            <span>{{ formatAccumulated(liveAccumulated) }}</span>
          </span>
          <button
            v-if="task.routine_id || task.is_routine"
            type="button"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-semibold transition-colors cursor-pointer group/routine"
            :title="`Configurar rutina: ${daysSummaryLabel}. Haz clic para editar días u opciones.`"
            @click.stop="emit('edit-routine', task)"
          >
            <span class="material-symbols-outlined text-[12px]">cached</span><span>Rutina</span>
            <span v-if="daysAbbrev" class="font-normal opacity-85">({{ daysAbbrev }})</span>
            <span class="material-symbols-outlined text-[10px] opacity-60 group-hover/routine:opacity-100 transition-opacity">edit</span>
          </button>
          <span v-if="task.is_routine_template && !task.is_active_today" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant/80 text-[10px] font-medium" title="Esta rutina no está programada para hoy">
            <span class="material-symbols-outlined text-[11px]">event_busy</span><span>No programada hoy</span>
          </span>
        </div>
      </div>
    </div>
    <div class="absolute bottom-2 right-2" @click.stop>
      <button type="button" class="w-7 h-7 rounded-lg flex items-center justify-center text-outline/70 hover:text-error hover:bg-error/10 transition-colors" title="Eliminar tarea" :aria-label="`Eliminar ${task.title}`" :disabled="removing" @click="handleDeleteClick">
        <span class="material-symbols-outlined text-[16px]">delete</span>
      </button>
    </div>
  </div>
  <ConfirmModal v-model:open="confirmDelete" title="Eliminar tarea" :message="`¿Eliminar «${task.title}»? Esta acción no se puede deshacer.`" confirm-label="Eliminar" @confirm="onDelete" />
  <RoutineScopeModal v-model:open="showScopeModal" :action="scopeAction" :task-title="task.title" @select="onRoutineScopeSelect" @cancel="onRoutineScopeCancel" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useTimerStore } from '@/stores/timer.store'
import { formatAccumulated } from '@/lib/format-accumulated'
import { TaskCardHelper } from '@/lib/task-card-helper'
import TaskStatusMenu from '@/components/TaskStatusMenu.vue'
import TaskPriorityMenu from '@/components/TaskPriorityMenu.vue'
import TaskInlineTags from '@/components/task/TaskInlineTags.vue'
import TaskDueDateChip from '@/components/task/TaskDueDateChip.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import RoutineScopeModal from '@/components/RoutineScopeModal.vue'

const props = defineProps({ task: { type: Object, required: true }, navigateOnSelect: { type: Boolean, default: true } })
const emit = defineEmits(['select', 'edit-routine'])
const tasks = useTasksStore(), timer = useTimerStore()
const confirmDelete = ref(false), removing = ref(false), showScopeModal = ref(false)
const scopeAction = ref('edit'), pendingTitleEdit = ref(''), titleDraft = ref(props.task.title || ''), titleFocused = ref(false)
const daysAbbrev = computed(() => TaskCardHelper.daysAbbrev(props.task.days_of_week))
const daysSummaryLabel = computed(() => TaskCardHelper.daysSummaryLabel(props.task.days_of_week))
const isActive = computed(() => props.task.id === tasks.activeTaskId)
const liveAccumulated = computed(() => TaskCardHelper.liveAccumulated(props.task, timer.state, timer.segmentElapsedMs))
watch(() => props.task.title, (t) => { if (!titleFocused.value) titleDraft.value = t || '' })

async function saveTitle() {
  titleFocused.value = false
  const title = titleDraft.value.trim()
  if (!title || title === props.task.title) { titleDraft.value = props.task.title || ''; return }
  if (props.task.routine_id) { pendingTitleEdit.value = title; scopeAction.value = 'edit'; showScopeModal.value = true; return }
  await tasks.update(props.task.id, { title })
}
function handleDeleteClick() {
  if (!props.task.is_routine_template && props.task.routine_id) { scopeAction.value = 'delete'; showScopeModal.value = true }
  else confirmDelete.value = true
}
async function onRoutineScopeSelect(scope) {
  if (scopeAction.value === 'delete') {
    if (removing.value) return
    removing.value = true
    try { await tasks.remove(props.task.id, { scope }) } finally { removing.value = false }
  } else if (scopeAction.value === 'edit' && pendingTitleEdit.value) {
    await tasks.update(props.task.id, { title: pendingTitleEdit.value }, { scope }); pendingTitleEdit.value = ''
  }
}
function onRoutineScopeCancel() { if (scopeAction.value === 'edit') { titleDraft.value = props.task.title || ''; pendingTitleEdit.value = '' } }
async function onDelete() {
  if (removing.value) return
  removing.value = true
  try { await tasks.remove(props.task.id) } finally { removing.value = false }
}
function blurActive() { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() }
</script>
