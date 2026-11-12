const PriorityCalculator = require('../lib/PriorityCalculator')
const { localDay, addDaysLocal } = require('../lib/date')

const SELECT_WITH_TAGS = `
  SELECT t.*, GROUP_CONCAT(g.name, ',') AS tags
  FROM tasks t
  LEFT JOIN task_tags tt ON tt.task_id = t.id
  LEFT JOIN tags g ON g.id = tt.tag_id
`

class TaskMapper {
  static SELECT_WITH_TAGS = SELECT_WITH_TAGS

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
      status: row.status,
      priority: row.priority || PriorityCalculator.deriveLabel(priorityScore),
      due_date: row.due_date,
      estimated_pomodoros: row.estimated_pomodoros,
      completed_pomodoros: row.completed_pomodoros,
      accumulated_ms: row.accumulated_ms,
      impact,
      urgency,
      effort,
      dependencies,
      risk,
      priority_score: priorityScore,
      routine_id: row.routine_id != null ? Number(row.routine_id) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags ? String(row.tags).split(',').filter(Boolean) : []
    }
  }

  static buildListQuery(filters = {}) {
    const clauses = []
    const params = {}

    if (filters.status) {
      clauses.push('t.status = @status')
      params.status = filters.status
    }
    if (filters.q) {
      clauses.push('t.title LIKE @q')
      params.q = `%${filters.q}%`
    }
    if (filters.priority) {
      clauses.push('t.priority = @priority')
      params.priority = filters.priority
    }
    if (filters.tag) {
      clauses.push(`EXISTS (
        SELECT 1 FROM task_tags tt2
        JOIN tags g2 ON g2.id = tt2.tag_id
        WHERE tt2.task_id = t.id AND g2.name = @tag COLLATE NOCASE
      )`)
      params.tag = String(filters.tag).trim()
    }
    if (filters.routine_id !== undefined) {
      if (filters.routine_id === null) {
        clauses.push('t.routine_id IS NULL')
      } else {
        clauses.push('t.routine_id = @routine_id')
        params.routine_id = filters.routine_id
      }
    }

    const today = localDay()
    if (filters.due === 'overdue') {
      clauses.push(`t.due_date IS NOT NULL AND t.due_date < @today AND t.status NOT IN ('done', 'cancelled')`)
      params.today = today
    } else if (filters.due === 'today') {
      clauses.push('t.due_date = @today')
      params.today = today
    } else if (filters.due === 'upcoming') {
      clauses.push(`t.due_date IS NOT NULL AND t.due_date > @today AND t.due_date <= @until AND t.status NOT IN ('done', 'cancelled')`)
      params.today = today
      params.until = addDaysLocal(today, 2)
    } else if (filters.due === 'set') {
      clauses.push('t.due_date IS NOT NULL')
    } else if (filters.due === 'none') {
      clauses.push('t.due_date IS NULL')
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const sql = `
      ${SELECT_WITH_TAGS}
      ${where}
      GROUP BY t.id
      ORDER BY
        CASE t.status
          WHEN 'in_progress' THEN 0
          WHEN 'todo' THEN 1
          WHEN 'blocked' THEN 2
          WHEN 'done' THEN 3
          ELSE 4
        END,
        t.priority_score DESC,
        t.created_at DESC
    `
    return { sql, params }
  }
}

module.exports = TaskMapper
