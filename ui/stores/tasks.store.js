import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const query = ref('')
  const activeTaskId = ref(null)

  const openTasks = computed(() =>
    tasks.value.filter((t) => !['done', 'cancelled'].includes(t.status))
  )
  const doneTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'done')
  )
  const activeTask = computed(
    () => tasks.value.find((t) => t.id === activeTaskId.value) || null
  )
  const completedCount = computed(() => doneTasks.value.length)
  const totalCount = computed(() => tasks.value.length)

  async function refresh() {
    const filters = query.value ? { q: query.value } : {}
    const res = await window.pomodoroAPI.tasks.list(filters)
    if (res.ok) tasks.value = res.data
    const settings = await window.pomodoroAPI.settings.get()
    if (settings.ok) activeTaskId.value = settings.data.active_task_id
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
    const res = await window.pomodoroAPI.tasks.update(id, { status: 'done' })
    if (res.ok) await refresh()
    return res
  }

  async function exportTasks(format = 'json') {
    return window.pomodoroAPI.tasks.export(format)
  }

  function subscribe() {
    return window.pomodoroAPI.tasks.onChanged(() => {
      refresh()
    })
  }

  return {
    tasks,
    query,
    activeTaskId,
    openTasks,
    doneTasks,
    activeTask,
    completedCount,
    totalCount,
    refresh,
    create,
    setActive,
    markDone,
    exportTasks,
    subscribe
  }
})
