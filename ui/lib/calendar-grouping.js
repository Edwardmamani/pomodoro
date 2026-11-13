import { addDaysIso, getIsoWeekday } from './calendar-dates.js'

const STATUS_ORDER = { in_progress: 0, todo: 1, blocked: 2, done: 3, cancelled: 4 }

export function sortCalendarTasks(list) {
  return [...list].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 5
    const sb = STATUS_ORDER[b.status] ?? 5
    if (sa !== sb) return sa - sb
    return (b.priority_score || 0) - (a.priority_score || 0)
  })
}

function buildProjectedRoutine(routine, iso) {
  return {
    ...routine,
    id: `projected_${routine.routine_id}_${iso}`,
    due_date: iso,
    status: 'todo',
    is_projected: true,
    is_routine: true
  }
}

export function groupTasksByDate(tasks = [], routines = [], startIso, endIso, todayIso) {
  const byDate = new Map()
  const unscheduled = []
  const existingRoutineKeys = new Set()

  for (const t of tasks) {
    if (!t.due_date) {
      unscheduled.push(t)
      continue
    }
    const iso = String(t.due_date).slice(0, 10)
    if (t.routine_id) existingRoutineKeys.add(`${t.routine_id}:${iso}`)
    if (!byDate.has(iso)) byDate.set(iso, [])
    byDate.get(iso).push(t)
  }

  if (startIso && endIso && routines.length) {
    let cur = startIso <= todayIso ? addDaysIso(todayIso, 1) : startIso
    while (cur <= endIso) {
      const wd = getIsoWeekday(cur)
      for (const r of routines) {
        const rid = r.routine_id
        if (!rid || !Array.isArray(r.days_of_week) || !r.days_of_week.includes(wd)) continue
        if (existingRoutineKeys.has(`${rid}:${cur}`)) continue
        if (!byDate.has(cur)) byDate.set(cur, [])
        byDate.get(cur).push(buildProjectedRoutine(r, cur))
      }
      cur = addDaysIso(cur, 1)
    }
  }

  for (const [iso, list] of byDate.entries()) {
    byDate.set(iso, sortCalendarTasks(list))
  }

  return { byDate, unscheduled: sortCalendarTasks(unscheduled) }
}
