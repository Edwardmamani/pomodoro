<template>
  <aside class="h-full w-full bg-surface-container-low p-5 flex flex-col overflow-hidden">
    <TaskPanelHeader />

    <div class="flex flex-col gap-2 mt-4 flex-1 min-h-0 overflow-y-auto">
      <header class="flex items-center justify-between px-1 pt-1 pb-0.5 text-on-surface-variant shrink-0">
        <span class="font-label-mono-sm uppercase tracking-wider text-outline">{{ openHeaderTitle }}</span>
        <span class="font-label-mono-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-primary">{{ openCountLabel }}</span>
      </header>

      <TaskOpenItem v-for="task in tasks.openTasks" :key="task.id" :task="task" @select="openTaskNotes" @edit-routine="openEditRoutine" />

      <template v-if="!tasks.filters.routine">
        <div class="pt-2 mt-1 border-t border-outline-variant/30 flex items-center justify-between px-1 shrink-0">
          <span class="font-label-mono-sm uppercase tracking-wider text-outline">Completadas</span>
          <span class="font-label-mono-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-outline">
            {{ tasks.doneTasks.length }} completada{{ tasks.doneTasks.length === 1 ? '' : 's' }}
          </span>
        </div>
        <TaskDoneItem v-for="task in tasks.doneTasks" :key="task.id" :task="task" :active-task-id="tasks.activeTaskId" />
      </template>
    </div>

    <div class="pt-4 mt-auto shrink-0 flex items-center gap-2 bg-surface-container-low">
      <button type="button" class="flex-1 h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md flex items-center justify-center gap-2 transition-colors cursor-pointer" @click="onAddTask">
        <span class="material-symbols-outlined text-[18px]">add</span>
        <span>Añadir tarea</span>
      </button>
      <button type="button" class="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer" title="Exportar tareas" @click="tasks.exportTasks('json')">
        <span class="material-symbols-outlined text-[18px]">file_download</span>
      </button>
    </div>

    <TaskFormModal v-model:open="showForm" :edit-task="editingTask" @update:open="(v) => { if (!v) editingTask = null }" />
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks.store'
import TaskPanelHeader from './TaskPanelHeader.vue'
import TaskFormModal from '@/components/TaskFormModal.vue'
import TaskOpenItem from '@/components/TaskOpenItem.vue'
import TaskDoneItem from '@/components/TaskDoneItem.vue'

const router = useRouter()
const tasks = useTasksStore()
const showForm = ref(false)
const editingTask = ref(null)

const openHeaderTitle = computed(() =>
  tasks.filters.routine ? 'Rutinas configuradas' : tasks.filters.status === 'cancelled' ? 'Canceladas' : 'Tareas Abiertas'
)
const openCountLabel = computed(() => {
  const n = tasks.openTasks.length
  if (tasks.filters.routine) return `${n} ${n === 1 ? 'rutina' : 'rutinas'}`
  if (tasks.filters.status === 'cancelled') return `${n} ${n === 1 ? 'cancelada' : 'canceladas'}`
  return `${n} ${n === 1 ? 'abierta' : 'abiertas'}`
})

const openEditRoutine = (task) => { editingTask.value = task; showForm.value = true }
const onAddTask = () => { editingTask.value = null; showForm.value = true }
const openTaskNotes = (id) => router.push(`/tarea/${id}`)
</script>
