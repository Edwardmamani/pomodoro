const { getConnection } = require('../db/connection')
const PriorityCalculator = require('../lib/PriorityCalculator')
const RoutineMapper = require('./RoutineMapper')

const SELECT_ROUTINE_WITH_TAGS = `
  SELECT r.*, GROUP_CONCAT(g.name, ',') AS tags
  FROM routines r
  LEFT JOIN routine_tags rt ON rt.routine_id = r.id
  LEFT JOIN tags g ON g.id = rt.tag_id
`

class RoutineModel {
  get db() {
    return getConnection()
  }

  static parseDaysOfWeek = RoutineMapper.parseDaysOfWeek
  static matchesDay = RoutineMapper.matchesDay
  static map = RoutineMapper.map

  listActive() {
    return this.db
      .prepare(`${SELECT_ROUTINE_WITH_TAGS} WHERE r.is_active = 1 GROUP BY r.id ORDER BY r.id ASC`)
      .all()
      .map(RoutineMapper.map)
  }

  getById(id) {
    const row = this.db.prepare(`${SELECT_ROUTINE_WITH_TAGS} WHERE r.id = ? GROUP BY r.id`).get(id)
    return RoutineMapper.map(row)
  }

  create({ title, priority, estimated, impact = 3, urgency = 3, effort = 3, dependencies = 1, risk = 1, daysOfWeek = [], tags = [] }) {
    const now = new Date().toISOString()
    const days = RoutineMapper.parseDaysOfWeek(daysOfWeek)
    const v = PriorityCalculator.normalizeVectors({ impact, urgency, effort, dependencies, risk })
    const prio = priority || PriorityCalculator.deriveLabel(v.score)

    return this.db.transaction(() => {
      const routineId = this.db
        .prepare(
          `INSERT INTO routines (
            title, priority, estimated_pomodoros, impact, urgency, effort,
            dependencies, risk, priority_score, days_of_week, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .run(
          title, prio, Number(estimated) || 0, v.impact, v.urgency, v.effort,
          v.dependencies, v.risk, v.score, JSON.stringify(days), now, now
        ).lastInsertRowid

      this.linkTags(routineId, tags)
      return routineId
    })()
  }

  update(id, { title, priority, estimated, impact, urgency, effort, dependencies, risk, daysOfWeek, isActive, tags }) {
    const existing = this.getById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const targetTitle = title !== undefined ? String(title).trim() : existing.title
    const days = daysOfWeek !== undefined ? RoutineMapper.parseDaysOfWeek(daysOfWeek) : existing.days_of_week
    const v = PriorityCalculator.normalizeVectors({ impact, urgency, effort, dependencies, risk }, existing)
    const prio = priority !== undefined ? priority : PriorityCalculator.deriveLabel(v.score)
    const activeVal = isActive !== undefined ? (isActive ? 1 : 0) : (existing.is_active ? 1 : 0)

    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE routines SET
            title = ?, priority = ?, estimated_pomodoros = ?,
            impact = ?, urgency = ?, effort = ?, dependencies = ?, risk = ?,
            priority_score = ?, days_of_week = ?, is_active = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          targetTitle, prio, estimated !== undefined ? Number(estimated) : existing.estimated_pomodoros,
          v.impact, v.urgency, v.effort, v.dependencies, v.risk, v.score,
          JSON.stringify(days), activeVal, now, id
        )

      if (Array.isArray(tags)) {
        this.db.prepare('DELETE FROM routine_tags WHERE routine_id = ?').run(id)
        this.linkTags(id, tags)
      }
    })()
    return this.getById(id)
  }

  delete(id) {
    return this.db.prepare('DELETE FROM routines WHERE id = ?').run(id).changes
  }

  linkTags(routineId, tagNames = []) {
    const find = this.db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
    const insert = this.db.prepare('INSERT INTO tags (name) VALUES (?)')
    const link = this.db.prepare('INSERT INTO routine_tags (routine_id, tag_id) VALUES (?, ?)')
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
