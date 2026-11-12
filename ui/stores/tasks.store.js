import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTimerStore } from '@/stores/timer.store'
import { TaskStoreHelper } from '@/lib/task-store-helper'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const query = ref('')
  const filters = ref(TaskStoreHelper.emptyFilters())
  const activeTaskId = ref(null)

  const openTasks = computed(() => {
    if (filters.value.routine) return tasks.value
    if (filters.value.status === 'cancelled') return tasks.value.filter((t) => t.status === 'cancelled')
    return tasks.value.filter((t) => !['done', 'cancelled'].includes(t.status))
  })
  const doneTasks = computed(() => {
    if (filters.value.routine || filters.value.status === 'cancelled') return []
    return tasks.value.filter((t) => t.status === 'done')
  })
  const activeTask = computed(() => tasks.value.find((t) => t.id === activeTaskId.value) || null)
  const completedCount = computed(() => doneTasks.value.length)
  const totalCount = computed(() => tasks.value.length)
  const activeFilterCount = computed(() => {
    const f = filters.value
    return [f.priority, f.status, f.tag, f.due, f.routine].filter(Boolean).length
  })
  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  const buildListFilters = () => TaskStoreHelper.buildListFilters(query.value, filters.value)

  async function refresh() {
    const res = await window.pomodoroAPI.tasks.list(buildListFilters())
    if (res.ok) tasks.value = res.data
    const settings = await window.pomodoroAPI.settings.get()
    if (settings.ok) activeTaskId.value = settings.data.active_task_id
  }

  function setFilter(key, value) {
    const next = value || null
    filters.value = { ...filters.value, [key]: filters.value[key] === next ? null : next }
    return refresh()
  }

  function clearFilters() {
    filters.value = TaskStoreHelper.emptyFilters()
    return refresh()
  }

  async function create(input) {
    const res = await window.pomodoroAPI.tasks.create(input)
    if (res.ok) await refresh()
    return res
  }

  async function setActive(id) {
    const res = await window.pomodoroAPI.tasks.setActive(id)
    if (res.ok) await refresh()
    return res
  }

  const markDone = (id) => updateStatus(id, 'done')
  const updateStatus = (id, status) => update(id, { status })

  async function update(id, input, options = {}) {
    const res = await window.pomodoroAPI.tasks.update(id, input, options)
    if (res.ok) await refresh()
    return res
  }

  async function remove(id, options = {}) {
    const res = await window.pomodoroAPI.tasks.remove(id, options)
    if (res.ok) await refresh()
    return res
  }

  const getRoutine = (routineId) => window.pomodoroAPI.tasks.getRoutine(routineId)

  async function updateRoutine(routineId, input) {
    const res = await window.pomodoroAPI.tasks.updateRoutine(routineId, input)
    if (res.ok) await refresh()
    return res
  }

  const exportTasks = (format = 'json') => window.pomodoroAPI.tasks.export(format, buildListFilters())
  const subscribe = () => window.pomodoroAPI.tasks.onChanged(() => refresh())
  const displayAccumulatedMs = (task) => TaskStoreHelper.displayAccumulatedMs(task, useTimerStore())

  return {
    tasks, query, filters, activeTaskId, openTasks, doneTasks, activeTask,
    completedCount, totalCount, activeFilterCount, hasActiveFilters,
    displayAccumulatedMs, refresh, setFilter, clearFilters, create, setActive,
    markDone, updateStatus, update, remove, getRoutine, updateRoutine, exportTasks, subscribe
  }
})
