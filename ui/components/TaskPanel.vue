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
      <div class="flex items-center gap-2 w-full">
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
        <TaskOpenItem
          v-for="task in tasks.openTasks"
          :key="task.id"
          :task="task"
          @select="openTaskNotes"
        />

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
              <span
                :class="
                  task.id === tasks.activeTaskId ? 'text-primary' : ''
                "
                >{{ formatAccumulated(liveAccumulated(task)) }}</span
              >
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

    <TaskFormModal v-model:open="showForm" />
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '../stores/tasks.store.js'
import { useTimerStore } from '../stores/timer.store.js'
import TaskFormModal from './TaskFormModal.vue'
import TaskStatusMenu from './TaskStatusMenu.vue'
import TaskFilterMenu from './TaskFilterMenu.vue'
import TaskOpenItem from './TaskOpenItem.vue'

const router = useRouter()
const tasks = useTasksStore()
const timer = useTimerStore()
const showForm = ref(false)

let searchTimer = null

const progressPct = computed(() => {
  if (!tasks.totalCount) return 0
  return Math.round((tasks.completedCount / tasks.totalCount) * 100)
})

function liveAccumulated(task) {
  if (!task) return 0
  const base = task.accumulated_ms || 0
  const bindingId = timer.state.bindingTaskId
  if (bindingId == null || Number(task.id) !== Number(bindingId)) return base
  return base + timer.segmentElapsedMs
}

function openTaskNotes(id) {
  router.push(`/tarea/${id}`)
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => tasks.refresh(), 200)
}

function formatAccumulated(ms) {
  const totalSec = Math.floor((ms || 0) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatDueDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}`
}
</script>
