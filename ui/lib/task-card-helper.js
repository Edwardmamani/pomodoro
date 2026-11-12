const WEEKDAY_ABBREVS = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }
const WEEKDAY_NAMES = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo'
}

/**
 * Utilidades OOP de presentación y fechas para tarjetas de tareas abiertas.
 */
export class TaskCardHelper {
  static daysAbbrev(days) {
    if (!days || !days.length) return ''
    if (days.length === 7) return 'Todos los días'
    if (days.length === 5 && [1, 2, 3, 4, 5].every((v) => days.includes(v))) return 'L-V'
    if (days.length === 6 && [1, 2, 3, 4, 5, 6].every((v) => days.includes(v))) return 'L-S'
    return days.map((id) => WEEKDAY_ABBREVS[id] || id).join(',')
  }

  static daysSummaryLabel(days) {
    if (!days || !days.length) return 'Sin días configurados'
    if (days.length === 7) return 'Todos los días'
    if (days.length === 5 && [1, 2, 3, 4, 5].every((v) => days.includes(v))) return 'Lunes a Viernes'
    if (days.length === 6 && [1, 2, 3, 4, 5, 6].every((v) => days.includes(v))) return 'Lunes a Sábado'
    return days.map((id) => WEEKDAY_NAMES[id] || id).join(', ')
  }

  static todayLocal() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  static formatDueDate(iso) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return y && m && d ? `${d}/${m}` : iso
  }

  static dueDateClass(task) {
    if (!task.due_date || ['done', 'cancelled'].includes(task.status)) return 'text-outline'
    const today = TaskCardHelper.todayLocal()
    if (task.due_date < today) return 'text-error bg-error/10'
    if (task.due_date === today) return 'text-secondary bg-secondary/10'
    return 'text-outline'
  }

  static liveAccumulated(task, timerState, segmentElapsedMs) {
    const base = task.accumulated_ms || 0
    const bindingId = timerState.bindingTaskId
    if (bindingId == null || Number(task.id) !== Number(bindingId)) return base
    return base + segmentElapsedMs
  }
}
