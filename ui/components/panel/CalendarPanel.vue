<template>
  <aside class="h-full w-full bg-surface-container-low p-4 flex flex-col gap-3 overflow-hidden">
    <CalendarToolbar :view-mode="viewMode" :title="periodTitle" @update:view-mode="setViewMode" @navigate="onNavigate" @today="anchorDate = today" />
    <CalendarFilterBar :model-value="filters" :tags="availableTags" @update:model-value="setFilters" @reset="resetFilters" />

    <CalendarDayView v-if="viewMode === 'day'" :anchor-date="anchorDate" :by-date="grouped.byDate" :unscheduled="grouped.unscheduled" @select-task="selectedTask = $event" @add-task="openCreate" />
    <CalendarWeekView v-else-if="viewMode === 'week'" :anchor-date="anchorDate" :today="today" :by-date="grouped.byDate" @select-task="selectedTask = $event" @add-task="openCreate" @open-day="drillToDay" />
    <CalendarMonthView v-else :anchor-date="anchorDate" :today="today" :by-date="grouped.byDate" @select-task="selectedTask = $event" @add-task="openCreate" @open-day="drillToDay" />

    <CalendarTaskDetailModal :task="selectedTask" @close="selectedTask = null" @edit="onEditFromModal" @notes="onNotes" @activate="onActivate" />
    <TaskFormModal v-model:open="showForm" :edit-task="editingTask" :default-due-date="defaultDueDate" @created="loadCalendarData" @updated="loadCalendarData" @update:open="(v) => { if (!v) editingTask = null }" />
  </aside>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks.store'
import { localDay } from '@/lib/urgency'
import { formatPeriodTitle, getMonthGridDays, getWeekDays, shiftDate } from '@/lib/calendar-dates'
import { groupTasksByDate } from '@/lib/calendar-grouping'
import { collectAvailableTags, defaultCalendarFilters, filterCalendarItems, loadCalendarFilters, saveCalendarFilters } from '@/lib/calendar-filters'
import CalendarToolbar from '@/components/calendar/CalendarToolbar.vue'
import CalendarFilterBar from '@/components/calendar/CalendarFilterBar.vue'
import CalendarDayView from '@/components/calendar/CalendarDayView.vue'
import CalendarWeekView from '@/components/calendar/CalendarWeekView.vue'
import CalendarMonthView from '@/components/calendar/CalendarMonthView.vue'
import CalendarTaskDetailModal from '@/components/calendar/CalendarTaskDetailModal.vue'
import TaskFormModal from '@/components/TaskFormModal.vue'

const VIEW_KEY = 'pomodoro.calendarView'
const router = useRouter()
const tasksStore = useTasksStore()
const today = localDay()
const anchorDate = ref(today)
const viewMode = ref(loadSavedView())
const filters = ref(loadCalendarFilters())
const allTasks = ref([])
const allRoutines = ref([])
const selectedTask = ref(null)
const showForm = ref(false)
const editingTask = ref(null)
const defaultDueDate = ref('')

function loadSavedView() {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return ['day', 'week', 'month'].includes(v) ? v : 'month'
  } catch { return 'month' }
}
function setViewMode(mode) {
  viewMode.value = mode
  try { localStorage.setItem(VIEW_KEY, mode) } catch { /* ignore */ }
}
const setFilters = (next) => { filters.value = next; saveCalendarFilters(next) }
const resetFilters = () => setFilters(defaultCalendarFilters())
const availableTags = computed(() => collectAvailableTags(allTasks.value, allRoutines.value))
const periodTitle = computed(() => formatPeriodTitle(anchorDate.value, viewMode.value))
const visibleRange = computed(() => {
  if (viewMode.value === 'day') return [anchorDate.value, anchorDate.value]
  if (viewMode.value === 'week') {
    const d = getWeekDays(anchorDate.value, today)
    return [d[0].iso, d[d.length - 1].iso]
  }
  const g = getMonthGridDays(anchorDate.value, today)
  return [g[0].iso, g[g.length - 1].iso]
})
const grouped = computed(() => {
  const [start, end] = visibleRange.value
  const fTasks = filterCalendarItems(allTasks.value, filters.value)
  const fRoutines = filterCalendarItems(allRoutines.value, filters.value)
  return groupTasksByDate(fTasks, fRoutines, start, end, today)
})

async function loadCalendarData() {
  const [tRes, rRes] = await Promise.all([
    window.pomodoroAPI.tasks.list({}),
    window.pomodoroAPI.tasks.list({ routine: true })
  ])
  if (tRes?.ok) allTasks.value = tRes.data || []
  if (rRes?.ok) allRoutines.value = rRes.data || []
}
const onNavigate = (delta) => { anchorDate.value = shiftDate(anchorDate.value, viewMode.value, delta) }
const drillToDay = (iso) => { anchorDate.value = iso; setViewMode('day') }
const openCreate = (iso) => { editingTask.value = null; defaultDueDate.value = iso || ''; showForm.value = true }
const onEditFromModal = (task) => { selectedTask.value = null; editingTask.value = task; showForm.value = true }
const onNotes = (id) => { selectedTask.value = null; router.push(`/tarea/${id}`) }
async function onActivate(id) { await tasksStore.setActive(id); selectedTask.value = null }

watch(() => tasksStore.tasks, loadCalendarData)
onMounted(loadCalendarData)
</script>
