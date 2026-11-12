const { getConnection } = require('../db/connection')

const SELECT_ROUTINE_WITH_TAGS = `
  SELECT r.*, GROUP_CONCAT(g.name, ',') AS tags
  FROM routines r
  LEFT JOIN routine_tags rt ON rt.routine_id = r.id
  LEFT JOIN tags g ON g.id = rt.tag_id
`

function parseDaysOfWeek(val) {
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

function calculatePriorityScore(impact, urgency, effort, dependencies, risk) {
  const i = Math.max(1, Math.min(5, Number(impact) || 3))
  const u = Math.max(1, Math.min(5, Number(urgency) || 3))
  const e = Math.max(1, Math.min(5, Number(effort) || 3))
  const d = Math.max(1, Math.min(5, Number(dependencies) || 1))
  const r = Math.max(1, Math.min(5, Number(risk) || 1))
  const score = (i * u + d * r) / e
  return Number(score.toFixed(2))
}

function derivePriorityLabel(score) {
  if (score >= 12) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

class RoutineModel {
  get db() {
    return getConnection()
  }

  static parseDaysOfWeek(val) {
    return parseDaysOfWeek(val)
  }

  static matchesDay(daysOfWeek, dayNumber) {
    const days = parseDaysOfWeek(daysOfWeek)
    return days.includes(Number(dayNumber))
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
        : calculatePriorityScore(impact, urgency, effort, dependencies, risk)

    return {
      id: row.id,
      title: row.title,
      priority: row.priority || derivePriorityLabel(priorityScore),
      estimated_pomodoros: row.estimated_pomodoros || 0,
      impact,
      urgency,
      effort,
      dependencies,
      risk,
      priority_score: priorityScore,
      days_of_week: parseDaysOfWeek(row.days_of_week),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags
        ? String(row.tags)
            .split(',')
            .filter(Boolean)
        : []
    }
  }

  listActive() {
    return this.db
      .prepare(`${SELECT_ROUTINE_WITH_TAGS} WHERE r.is_active = 1 GROUP BY r.id ORDER BY r.id ASC`)
      .all()
      .map(RoutineModel.map)
  }

  getById(id) {
    const row = this.db
      .prepare(`${SELECT_ROUTINE_WITH_TAGS} WHERE r.id = ? GROUP BY r.id`)
      .get(id)
    return RoutineModel.map(row)
  }

  create({
    title,
    priority,
    estimated,
    impact = 3,
    urgency = 3,
    effort = 3,
    dependencies = 1,
    risk = 1,
    daysOfWeek = [],
    tags = []
  }) {
    const db = this.db
    const now = new Date().toISOString()
    const days = parseDaysOfWeek(daysOfWeek)
    const imp = Math.max(1, Math.min(5, Number(impact) || 3))
    const urg = Math.max(1, Math.min(5, Number(urgency) || 3))
    const eff = Math.max(1, Math.min(5, Number(effort) || 3))
    const dep = Math.max(1, Math.min(5, Number(dependencies) || 1))
    const rsk = Math.max(1, Math.min(5, Number(risk) || 1))
    const score = calculatePriorityScore(imp, urg, eff, dep, rsk)
    const prio = priority || derivePriorityLabel(score)

    const tx = db.transaction(() => {
      const routineId = db
        .prepare(
          `
        INSERT INTO routines (
          title, priority, estimated_pomodoros, impact, urgency, effort,
          dependencies, risk, priority_score, days_of_week, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `
        )
        .run(
          title,
          prio,
          Number(estimated) || 0,
          imp,
          urg,
          eff,
          dep,
          rsk,
          score,
          JSON.stringify(days),
          now,
          now
        ).lastInsertRowid

      this.linkTags(routineId, tags)
      return routineId
    })
    return tx()
  }

  update(
    id,
    {
      title,
      priority,
      estimated,
      impact,
      urgency,
      effort,
      dependencies,
      risk,
      daysOfWeek,
      isActive,
      tags
    }
  ) {
    const db = this.db
    const existing = this.getById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const targetTitle = title !== undefined ? String(title).trim() : existing.title
    const days =
      daysOfWeek !== undefined ? parseDaysOfWeek(daysOfWeek) : existing.days_of_week

    const imp =
      impact !== undefined
        ? Math.max(1, Math.min(5, Number(impact) || 3))
        : existing.impact
    const urg =
      urgency !== undefined
        ? Math.max(1, Math.min(5, Number(urgency) || 3))
        : existing.urgency
    const eff =
      effort !== undefined
        ? Math.max(1, Math.min(5, Number(effort) || 3))
        : existing.effort
    const dep =
      dependencies !== undefined
        ? Math.max(1, Math.min(5, Number(dependencies) || 1))
        : existing.dependencies
    const rsk =
      risk !== undefined
        ? Math.max(1, Math.min(5, Number(risk) || 1))
        : existing.risk

    const score = calculatePriorityScore(imp, urg, eff, dep, rsk)
    const prio = priority !== undefined ? priority : derivePriorityLabel(score)
    const activeVal =
      isActive !== undefined ? (isActive ? 1 : 0) : (existing.is_active ? 1 : 0)

    const tx = db.transaction(() => {
      db.prepare(
        `
        UPDATE routines SET
          title = ?, priority = ?, estimated_pomodoros = ?,
          impact = ?, urgency = ?, effort = ?, dependencies = ?, risk = ?,
          priority_score = ?, days_of_week = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(
        targetTitle,
        prio,
        estimated !== undefined ? Number(estimated) : existing.estimated_pomodoros,
        imp,
        urg,
        eff,
        dep,
        rsk,
        score,
        JSON.stringify(days),
        activeVal,
        now,
        id
      )

      if (Array.isArray(tags)) {
        db.prepare('DELETE FROM routine_tags WHERE routine_id = ?').run(id)
        this.linkTags(id, tags)
      }
    })
    tx()
    return this.getById(id)
  }

  delete(id) {
    return this.db.prepare('DELETE FROM routines WHERE id = ?').run(id).changes
  }

  linkTags(routineId, tagNames = []) {
    const db = this.db
    const find = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
    const insert = db.prepare('INSERT INTO tags (name) VALUES (?)')
    const link = db.prepare(
      'INSERT INTO routine_tags (routine_id, tag_id) VALUES (?, ?)'
    )
    for (const name of tagNames) {
      const trimmed = String(name).trim()
      if (!trimmed) continue
      const existing = find.get(trimmed)
      const tagId = existing ? existing.id : insert.run(trimmed).lastInsertRowid
      link.run(routineId, tagId)
    }
  }
}

module.exports = RoutineModel
