export class TaskStoreHelper {
  static emptyFilters() {
    return { priority: null, status: null, tag: null, due: null, routine: null }
  }

  static buildListFilters(query, filters) {
    const out = {}
    if (query.trim()) out.q = query.trim()
    if (filters.priority) out.priority = filters.priority
    if (filters.status) out.status = filters.status
    if (filters.tag) out.tag = filters.tag
    if (filters.due) out.due = filters.due
    if (filters.routine) out.routine = true
    return out
  }

  static displayAccumulatedMs(task, timerStore) {
    if (!task) return 0
    const base = task.accumulated_ms || 0
    const bindingId = timerStore.state.bindingTaskId
    if (bindingId == null || Number(task.id) !== Number(bindingId)) return base
    return base + (timerStore.segmentElapsedMs || 0)
  }
}
