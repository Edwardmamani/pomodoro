const PriorityCalculator = require('../lib/PriorityCalculator')

class RoutineMapper {
  static parseDaysOfWeek(val) {
    if (!val) return []
    if (Array.isArray(val)) return val.map(Number).filter((n) => n >= 1 && n <= 7)
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter((n) => n >= 1 && n <= 7)
      }
    } catch {
      /* fallback a CSV */
    }
    return String(val)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => n >= 1 && n <= 7)
  }

  static matchesDay(daysOfWeek, dayNumber) {
    return RoutineMapper.parseDaysOfWeek(daysOfWeek).includes(Number(dayNumber))
  }

  static map(row) {
    if (!row) return null
    const impact = row.impact != null ? Number(row.impact) : 3
    const urgency = row.urgency != null ? Number(row.urgency) : 3
    const effort = row.effort != null ? Number(row.effort) : 3
    const dependencies = row.dependencies != null ? Number(row.dependencies) : 1
    const risk = row.risk != null ? Number(row.risk) : 1
    const priorityScore =
      row.priority_score != null
        ? Number(row.priority_score)
        : PriorityCalculator.calculateScore(impact, urgency, effort, dependencies, risk)

    return {
      id: row.id,
      title: row.title,
      priority: row.priority || PriorityCalculator.deriveLabel(priorityScore),
      estimated_pomodoros: row.estimated_pomodoros || 0,
      impact,
      urgency,
      effort,
      dependencies,
      risk,
      priority_score: priorityScore,
      days_of_week: RoutineMapper.parseDaysOfWeek(row.days_of_week),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags ? String(row.tags).split(',').filter(Boolean) : []
    }
  }
}

module.exports = RoutineMapper
