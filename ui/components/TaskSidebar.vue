<template>
  <aside
    class="h-full w-full bg-surface-container-low p-5 flex flex-col overflow-hidden"
  >
    <div class="flex flex-col gap-4 shrink-0">
      <!-- Título y progreso de tareas -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-primary"
              >checklist</span
            >
            <h2 class="font-headline-md text-on-surface tracking-tight">
              Tareas
            </h2>
          </div>
          <span class="font-label-mono text-outline"
            >{{ tasks.completedCount }}/{{ tasks.totalCount }}
            completadas</span
          >
        </div>
        <div class="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-500"
            :style="{ width: progressPct + '%' }"
          ></div>
        </div>
      </div>

      <!-- Buscador y filtros -->
      <div v-if="!editingTaskId" class="flex items-center gap-2 w-full">
        <div class="relative flex-1 min-w-0">
          <span
            class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline"
            >search</span
          >
          <input
            v-model="tasks.query"
            class="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container text-on-surface font-body-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-high transition-colors"
            placeholder="Buscar tareas..."
            type="text"
            @input="onSearch"
          />
        </div>
        <TaskFilterMenu />
      </div>
    </div>

    <TaskEditPanel
      v-if="editingTaskId"
      :task-id="editingTaskId"
      @close="editingTaskId = null"
    />

    <template v-else>
      <div class="flex flex-col gap-2 mt-4 flex-1 min-h-0 overflow-y-auto">
        <!-- Tareas abiertas -->
        <div
          class="flex items-center justify-between px-1 pt-1 pb-0.5 text-on-surface-variant shrink-0"
        >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >{{
              tasks.filters.status === 'cancelled'
                ? 'Canceladas'
                : 'Tareas Abiertas'
            }}</span
          >
          <span
            class="font-label-mono-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-primary"
            >{{ tasks.openTasks.length }}
            {{
              tasks.filters.status === 'cancelled' ? 'cancelada' : 'abierta'
            }}{{ tasks.openTasks.length === 1 ? '' : 's' }}</span
          >
        </div>

        <!-- Lista de tareas abiertas -->
        <button
          v-for="task in tasks.openTasks"
          :key="task.id"
          type="button"
          class="group flex items-start gap-3 p-3 rounded-xl text-left transition-all cursor-pointer w-full"
          :class="
            task.id === tasks.activeTaskId
              ? 'bg-surface-container-high text-on-surface shadow-sm'
              : 'hover:bg-surface-container'
          "
          @click="openEdit(task.id)"
        >
          <div class="mt-0.5 flex-shrink-0" @click.stop>
            <TaskStatusMenu
              :task-id="task.id"
              :status="task.status"
              :accent="task.id === tasks.activeTaskId"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span
                class="truncate"
                :class="
                  task.id === tasks.activeTaskId
                    ? 'font-label-md text-on-surface'
                    : 'font-body-md text-on-surface'
                "
                >{{ task.title }}</span
              >
              <span
                class="font-label-mono-sm px-1.5 py-0.2 rounded shrink-0"
                :class="priorityClass(task.priority)"
                >{{ priorityLabel(task.priority) }}</span
              >
            </div>
            <div
              class="flex items-center gap-2 mt-1.5 text-on-surface-variant font-label-mono-sm flex-wrap"
            >
              <span
                v-if="task.tags[0]"
                class="px-1.5 py-0.5 rounded bg-surface-container text-outline"
                >{{ task.tags[0] }}</span
              >
              <span
                v-if="task.due_date"
                class="px-1.5 py-0.5 rounded bg-surface-container inline-flex items-center gap-0.5"
                :class="dueDateClass(task)"
                :title="'Finaliza ' + task.due_date"
              >
                <span class="material-symbols-outlined text-[11px]">event</span>
                {{ formatDueDate(task.due_date) }}
              </span>
              <span>·</span>
              <span
                :class="
                  task.id === tasks.activeTaskId ? 'text-primary' : ''
                "
                >{{ task.completed_pomodoros }}/{{
                  task.estimated_pomodoros
                }}
                pomos</span
              >
              <span>·</span>
              <span>{{ formatMinutes(task.accumulated_ms) }}</span>
            </div>
          </div>
        </button>

        <!-- Tareas completadas -->
        <div
          class="pt-2 mt-1 border-t border-outline-variant/30 flex items-center justify-between px-1 shrink-0"
        >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Completadas</span
          >
          <span
            class="font-label-mono-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-outline"
            >{{ tasks.doneTasks.length }} completada{{
              tasks.doneTasks.length === 1 ? '' : 's'
            }}</span
          >
        </div>

        <!-- Lista de tareas completadas -->
        <button
          v-for="task in tasks.doneTasks"
          :key="task.id"
          type="button"
          class="flex items-start gap-3 p-3 rounded-xl opacity-50 hover:opacity-75 transition-opacity bg-surface-container/40 text-left w-full cursor-pointer"
          @click="openEdit(task.id)"
        >
          <div class="mt-0.5 flex-shrink-0" @click.stop>
            <TaskStatusMenu :task-id="task.id" :status="task.status" />
          </div>
          <div class="flex-1 min-w-0">
            <span
              class="font-body-md line-through truncate text-on-surface-variant block"
              >{{ task.title }}</span
            >
            <div
              class="flex items-center gap-2 mt-1 text-on-surface-variant font-label-mono-sm"
            >
              <span
                v-if="task.tags[0]"
                class="px-1.5 py-0.5 rounded bg-surface-container text-outline"
                >{{ task.tags[0] }}</span
              >
              <span v-if="task.due_date">·</span>
              <span v-if="task.due_date">{{ formatDueDate(task.due_date) }}</span>
              <span>·</span>
              <span>{{ formatMinutes(task.accumulated_ms) }}</span>
            </div>
          </div>
        </button>
      </div>

      <!-- Botones de añadir tarea y exportar tareas -->
      <div
        class="pt-4 mt-auto shrink-0 flex items-center gap-2 bg-surface-container-low"
      >
        <button
          type="button"
          class="flex-1 h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md flex items-center justify-center gap-2 transition-colors"
          @click="showForm = true"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          <span>Añadir tarea</span>
        </button>
        <button
          type="button"
          class="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          title="Exportar tareas"
          @click="tasks.exportTasks('json')"
        >
          <span class="material-symbols-outlined text-[18px]"
            >file_download</span
          >
        </button>
      </div>
    </template>

    <TaskFormModal v-model:open="showForm" />
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTasksStore } from '../stores/tasks.store'
import TaskFormModal from './TaskFormModal.vue'
import TaskStatusMenu from './TaskStatusMenu.vue'
import TaskEditPanel from './TaskEditPanel.vue'
import TaskFilterMenu from './TaskFilterMenu.vue'

const tasks = useTasksStore()
const showForm = ref(false)
const editingTaskId = ref(null)

let searchTimer = null

const progressPct = computed(() => {
  if (!tasks.totalCount) return 0
  return Math.round((tasks.completedCount / tasks.totalCount) * 100)
})

function openEdit(id) {
  editingTaskId.value = id
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => tasks.refresh(), 200)
}

function priorityLabel(p) {
  return { high: 'Alta', medium: 'Media', low: 'Baja' }[p] || p
}

function priorityClass(p) {
  if (p === 'high')
    return 'bg-secondary-container text-on-secondary-container'
  if (p === 'medium')
    return 'bg-surface-container-highest text-on-surface-variant'
  return 'bg-surface-container-highest text-outline'
}

function formatMinutes(ms) {
  const m = Math.round((ms || 0) / 60000)
  return `${m}m`
}

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDueDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}`
}

function dueDateClass(task) {
  if (!task.due_date || ['done', 'cancelled'].includes(task.status)) {
    return 'text-outline'
  }
  const today = todayLocal()
  if (task.due_date < today) return 'text-error bg-error/10'
  if (task.due_date === today) return 'text-secondary bg-secondary/10'
  return 'text-outline'
}
</script>
