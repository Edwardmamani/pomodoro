const FILTERS_KEY = 'pomodoro.calendarFilters'

export function defaultCalendarFilters() {
  return { tag: '', routineType: 'all', showCompleted: true }
}

export function loadCalendarFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    if (!raw) return defaultCalendarFilters()
    const parsed = JSON.parse(raw)
    return {
      tag: typeof parsed.tag === 'string' ? parsed.tag : '',
      routineType: ['all', 'routine', 'non_routine'].includes(parsed.routineType) ? parsed.routineType : 'all',
      showCompleted: typeof parsed.showCompleted === 'boolean' ? parsed.showCompleted : true
    }
  } catch {
    return defaultCalendarFilters()
  }
}

export function saveCalendarFilters(filters) {
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)) } catch { /* ignore */ }
}

export function filterCalendarItems(items = [], filters = defaultCalendarFilters()) {
  const tagLower = (filters.tag || '').trim().toLowerCase()
  return items.filter((item) => {
    if (!filters.showCompleted && item.status === 'done') return false
    const isRoutine = Boolean(item.is_routine || item.routine_id)
    if (filters.routineType === 'routine' && !isRoutine) return false
    if (filters.routineType === 'non_routine' && isRoutine) return false
    if (tagLower) {
      const tags = Array.isArray(item.tags) ? item.tags : []
      if (!tags.some((t) => String(t).toLowerCase() === tagLower)) return false
    }
    return true
  })
}

export function collectAvailableTags(tasks = [], routines = []) {
  const byLower = new Map()
  for (const item of [...tasks, ...routines]) {
    for (const t of item.tags || []) {
      const clean = String(t).trim()
      if (clean && !byLower.has(clean.toLowerCase())) byLower.set(clean.toLowerCase(), clean)
    }
  }
  return [...byLower.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}
