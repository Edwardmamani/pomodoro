import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTimerStore } from '@/stores/timer.store'

function emptyFilters() {
  return {
    priority: null,
    status: null,
    tag: null,
    due: null
  }
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const query = ref('')
  const filters = ref(emptyFilters())
  const activeTaskId = ref(null)

  const openTasks = computed(() => {
    if (filters.value.status === 'cancelled') {
      return tasks.value.filter((t) => t.status === 'cancelled')
    }
    return tasks.value.filter((t) => !['done', 'cancelled'].includes(t.status))
  })
  const doneTasks = computed(() => {
    if (filters.value.status === 'cancelled') return []
    return tasks.value.filter((t) => t.status === 'done')
  })
  const activeTask = computed(
    () => tasks.value.find((t) => t.id === activeTaskId.value) || null
  )
  const completedCount = computed(() => doneTasks.value.length)
  const totalCount = computed(() => tasks.value.length)

  const activeFilterCount = computed(() => {
    const f = filters.value
    return [f.priority, f.status, f.tag, f.due].filter(Boolean).length
  })

  const hasActiveFilters = computed(() => activeFilterCount.value > 0)

  function buildListFilters() {
    const out = {}
    if (query.value.trim()) out.q = query.value.trim()
    if (filters.value.priority) out.priority = filters.value.priority
    if (filters.value.status) out.status = filters.value.status
    if (filters.value.tag) out.tag = filters.value.tag
    if (filters.value.due) out.due = filters.value.due
    return out
  }

  async function refresh() {
    const res = await window.pomodoroAPI.tasks.list(buildListFilters())
    if (res.ok) tasks.value = res.data
    const settings = await window.pomodoroAPI.settings.get()
    if (settings.ok) activeTaskId.value = settings.data.active_task_id
  }

  function setFilter(key, value) {
    const next = value || null
    filters.value = {
      ...filters.value,
      [key]: filters.value[key] === next ? null : next
    }
    return refresh()
  }

  function clearFilters() {
    filters.value = emptyFilters()
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

  async function markDone(id) {
    return updateStatus(id, 'done')
  }

  async function updateStatus(id, status) {
    return update(id, { status })
  }

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

  async function getRoutine(routineId) {
    return window.pomodoroAPI.tasks.getRoutine(routineId)
  }

  async function exportTasks(format = 'json') {
    return window.pomodoroAPI.tasks.export(format, buildListFilters())
  }

  function subscribe() {
    return window.pomodoroAPI.tasks.onChanged(() => {
      refresh()
    })
  }

  /**
   * Tiempo acumulado visible: persistido + tramo de focus aún no flusheado
   * de la tarea vinculada al segmento actual (bindingTaskId).
   */
  function displayAccumulatedMs(task) {
    if (!task) return 0
    const base = task.accumulated_ms || 0
    const timer = useTimerStore()
    const bindingId = timer.state.bindingTaskId
    if (bindingId == null || Number(task.id) !== Number(bindingId)) return base
    return base + (timer.segmentElapsedMs || 0)
  }

  return {
    tasks,
    query,
    filters,
    activeTaskId,
    openTasks,
    doneTasks,
    activeTask,
    completedCount,
    totalCount,
    activeFilterCount,
    hasActiveFilters,
    displayAccumulatedMs,
    refresh,
    setFilter,
    clearFilters,
    create,
    setActive,
    markDone,
    updateStatus,
    update,
    remove,
    getRoutine,
    exportTasks,
    subscribe
  }
})
