<template>
  <div class="flex flex-col gap-4 shrink-0">
    <div>
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-primary">checklist</span>
          <h2 class="font-headline-md text-on-surface tracking-tight">Tareas</h2>
        </div>
        <span class="font-label-mono text-outline">{{ tasks.completedCount }}/{{ tasks.totalCount }} completadas</span>
      </div>
      <div class="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-all duration-500" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>

    <div class="flex items-center gap-2 w-full">
      <div class="relative flex-1 min-w-0">
        <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
        <input
          v-model="tasks.query" type="text" placeholder="Buscar tareas..."
          class="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container text-on-surface font-body-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-high transition-colors"
          @input="onSearch"
        />
      </div>
      <TaskFilterMenu />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import TaskFilterMenu from '@/components/TaskFilterMenu.vue'

const tasks = useTasksStore()
let searchTimer = null
const progressPct = computed(() => (tasks.totalCount ? Math.round((tasks.completedCount / tasks.totalCount) * 100) : 0))
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => tasks.refresh(), 200)
}
</script>
