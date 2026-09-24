<template>
  <aside
    class="col-span-3 bg-surface-container-low p-5 flex flex-col justify-between overflow-y-auto"
  >
    <div class="flex flex-col gap-4">
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

      <div class="relative w-full">
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

      <div class="flex flex-col gap-2 mt-1">
        <div
          class="flex items-center justify-between px-1 pt-1 pb-0.5 text-on-surface-variant"
        >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Tareas Abiertas</span
          >
          <span
            class="font-label-mono-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-primary"
            >{{ tasks.openTasks.length }} abiertas</span
          >
        </div>

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
          @click="tasks.setActive(task.id)"
        >
          <div class="mt-0.5 flex-shrink-0">
            <div
              v-if="task.id === tasks.activeTaskId"
              class="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
            >
              <span
                class="material-symbols-outlined text-[12px] text-on-primary"
                style="font-variation-settings: 'FILL' 1"
                >play_arrow</span
              >
            </div>
            <button
              v-else
              type="button"
              class="w-4 h-4 rounded-full bg-surface-container-high group-hover:bg-primary/30 transition-colors"
              title="Marcar hecha"
              @click.stop="tasks.markDone(task.id)"
            ></button>
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
              class="flex items-center gap-2 mt-1.5 text-on-surface-variant font-label-mono-sm"
            >
              <span
                v-if="task.tags[0]"
                class="px-1.5 py-0.5 rounded bg-surface-container text-outline"
                >{{ task.tags[0] }}</span
              >
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

        <div
          class="pt-2 mt-1 border-t border-outline-variant/30 flex items-center justify-between px-1"
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

        <div
          v-for="task in tasks.doneTasks"
          :key="task.id"
          class="flex items-start gap-3 p-3 rounded-xl opacity-50 hover:opacity-75 transition-opacity bg-surface-container/40"
        >
          <div
            class="mt-0.5 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary"
          >
            <span class="material-symbols-outlined text-[12px]">check</span>
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
              <span>·</span>
              <span>{{ formatMinutes(task.accumulated_ms) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-4 mt-4 flex items-center gap-2">
      <button
        type="button"
        class="flex-1 h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md flex items-center justify-center gap-2 transition-colors"
        @click="showAdd = !showAdd"
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
        <span class="material-symbols-outlined text-[18px]">file_download</span>
      </button>
    </div>

    <form
      v-if="showAdd"
      class="mt-3 flex flex-col gap-2"
      @submit.prevent="onCreate"
    >
      <input
        v-model="newTitle"
        class="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface font-body-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
        placeholder="Título de la tarea"
        required
      />
      <div class="flex gap-2">
        <select
          v-model="newPriority"
          class="flex-1 h-9 px-2 rounded-lg bg-surface-container text-on-surface font-body-sm"
        >
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        <input
          v-model="newTag"
          class="flex-1 h-9 px-2 rounded-lg bg-surface-container text-on-surface font-body-sm"
          placeholder="Etiqueta"
        />
      </div>
      <button
        type="submit"
        class="h-9 rounded-xl bg-primary text-on-primary font-label-md"
      >
        Crear
      </button>
    </form>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTasksStore } from '../stores/tasks.store'

const tasks = useTasksStore()
const showAdd = ref(false)
const newTitle = ref('')
const newPriority = ref('medium')
const newTag = ref('')

let searchTimer = null

const progressPct = computed(() => {
  if (!tasks.totalCount) return 0
  return Math.round((tasks.completedCount / tasks.totalCount) * 100)
})

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

async function onCreate() {
  const tags = newTag.value.trim() ? [newTag.value.trim()] : []
  await tasks.create({
    title: newTitle.value,
    priority: newPriority.value,
    tags,
    estimated_pomodoros: 1,
    status: 'todo'
  })
  newTitle.value = ''
  newTag.value = ''
  newPriority.value = 'medium'
  showAdd.value = false
}
</script>
