<template>
  <div class="relative flex-shrink-0">
    <button
      ref="triggerEl" type="button"
      class="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
      :class="open || tasks.hasActiveFilters ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'"
      :title="tasks.hasActiveFilters ? `${tasks.activeFilterCount} filtro${tasks.activeFilterCount === 1 ? '' : 's'} activo${tasks.activeFilterCount === 1 ? '' : 's'}` : 'Filtrar tareas'"
      :aria-expanded="open" aria-haspopup="menu" @click.stop="toggle"
    >
      <span class="material-symbols-outlined text-[18px]">tune</span>
      <span v-if="tasks.activeFilterCount" class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-on-primary font-label-mono-sm text-[10px] leading-4 flex items-center justify-center">{{ tasks.activeFilterCount }}</span>
    </button>

    <TaskFilterDropdown :open="open" :menu-style="menuStyle" :tags="tags" @close="close" @pick="pick" @clear="onClear" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { FloatingMenuPositioner } from '@/lib/floating-menu-positioner'
import TaskFilterDropdown from './TaskFilterDropdown.vue'

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})
const tags = ref([])
const positioner = new FloatingMenuPositioner(triggerEl, menuStyle, { width: 248, height: 320, align: 'right' })

const loadTags = async () => {
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) tags.value = res.data || []
}
const close = () => { open.value = false }
const toggle = async () => {
  if (open.value) return close()
  await loadTags()
  open.value = true
  await nextTick()
  positioner.place()
}
const pick = (key, value) => tasks.setFilter(key, value)
const onClear = () => { if (tasks.hasActiveFilters) return tasks.clearFilters() }
const onKey = (e) => { if (e.key === 'Escape') close() }
const onScroll = () => { if (open.value) positioner.place() }
const onResize = () => positioner.place()
const bind = (on) => { const fn = on ? window.addEventListener : window.removeEventListener; fn('keydown', onKey); fn('scroll', onScroll, true); fn('resize', onResize) }

watch(open, (v) => bind(v))
onMounted(loadTags)
onBeforeUnmount(() => bind(false))
</script>
