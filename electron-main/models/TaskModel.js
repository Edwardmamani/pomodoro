const { getConnection } = require('../db/connection')
const { localDay, calculateUrgencyFromDueDate } = require('../lib/date')
const PriorityCalculator = require('../lib/PriorityCalculator')
const TaskMapper = require('./TaskMapper')
const TaskSyncService = require('./TaskSyncService')
const TagRepository = require('./TagRepository')

class TaskModel {
  constructor() {
    this.syncService = new TaskSyncService(this)
  }

  get db() {
    return getConnection()
  }

  static calculatePriorityScore = PriorityCalculator.calculateScore
  static calculateUrgencyFromDueDate = calculateUrgencyFromDueDate
  static map = TaskMapper.map

  needsDailySync() { return this.syncService.needsDailySync() }
  syncDailyUrgencies(force = false) { return this.syncService.syncDailyUrgencies(force) }
  syncDailyRoutines(today = localDay()) { return this.syncService.syncDailyRoutines(today) }
  list(filters = {}) {
    this.syncDailyUrgencies()
    const { sql, params } = TaskMapper.buildListQuery(filters)
    return this.db.prepare(sql).all(params).map(TaskMapper.map)
  }
  getById(id) {
    this.syncDailyUrgencies()
    return TaskMapper.map(this.db.prepare(`${TaskMapper.SELECT_WITH_TAGS} WHERE t.id = ? GROUP BY t.id`).get(id))
  }
  listTags() {
    return this.db.prepare('SELECT name FROM tags ORDER BY name COLLATE NOCASE ASC').all().map((r) => r.name)
  }

  create({ title, status, priority, dueDate, estimated, tags, impact = 3, urgency, effort = 3, dependencies = 1, risk = 1, routineId = null }) {
    const now = new Date().toISOString()
    const cleanDue = dueDate ? String(dueDate).trim() : null
    const resolvedUrg = cleanDue ? calculateUrgencyFromDueDate(cleanDue, localDay()) : (urgency ?? 1)
    const v = PriorityCalculator.normalizeVectors({ impact, urgency: resolvedUrg, effort, dependencies, risk })
    const prio = priority || PriorityCalculator.deriveLabel(v.score)

    return this.db.transaction(() => {
      const taskId = this.db.prepare(`
        INSERT INTO tasks (
          title, status, priority, due_date, estimated_pomodoros,
          completed_pomodoros, accumulated_ms, impact, urgency, effort,
          dependencies, risk, priority_score, routine_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title, status || 'todo', prio, cleanDue, Number(estimated) || 0,
        v.impact, v.urgency, v.effort, v.dependencies, v.risk, v.score, routineId || null, now, now
      ).lastInsertRowid
      this.linkTags(taskId, tags)
      return taskId
    })()
  }

  update(id, { title, status, priority, dueDate, estimated, tags, impact, urgency, effort, dependencies, risk, routineId }) {
    const existing = this.getById(id)
    if (!existing) return
    const now = new Date().toISOString()
    const targetDue = dueDate !== undefined ? (dueDate ? String(dueDate).trim() : null) : existing.due_date
    const resolvedUrg = targetDue ? calculateUrgencyFromDueDate(targetDue, localDay()) : (urgency ?? existing.urgency ?? 1)
    const v = PriorityCalculator.normalizeVectors({ impact, urgency: resolvedUrg, effort, dependencies, risk }, existing)
    const prio = priority !== undefined ? priority : PriorityCalculator.deriveLabel(v.score)

    this.db.transaction(() => {
      if ((status ?? existing.status) === 'in_progress') this.demoteInProgress(id, now)
      this.db.prepare(`
        UPDATE tasks SET title = ?, status = ?, priority = ?, due_date = ?,
          estimated_pomodoros = ?, impact = ?, urgency = ?, effort = ?,
          dependencies = ?, risk = ?, priority_score = ?, routine_id = ?, updated_at = ?
        WHERE id = ?
      `).run(
        title !== undefined ? String(title).trim() : existing.title,
        status ?? existing.status, prio, targetDue,
        estimated !== undefined ? Number(estimated) || 0 : existing.estimated_pomodoros,
        v.impact, v.urgency, v.effort, v.dependencies, v.risk, v.score,
        routineId !== undefined ? (routineId || null) : existing.routine_id, now, id
      )
      if (Array.isArray(tags)) {
        this.db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id)
        this.linkTags(id, tags)
      }
    })()
  }

  activate(id, { keepStatus = false } = {}) {
    const now = new Date().toISOString()
    this.db.transaction(() => {
      this.demoteInProgress(id, now)
      if (!keepStatus) this.db.prepare("UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ?").run(now, id)
    })()
  }

  remove(id) { return this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes }
  demoteInProgress(exceptId, now) {
    this.db.prepare("UPDATE tasks SET status = 'todo', updated_at = ? WHERE status = 'in_progress' AND id != ?").run(now, exceptId)
  }

  linkTags(taskId, tagNames = []) {
    TagRepository.link('task_tags', 'task_id', taskId, tagNames)
  }

  getNextTask(exceptId) {
    return this.db.prepare(`
      SELECT id FROM tasks WHERE status = 'todo' AND id != ?
      ORDER BY priority_score DESC, due_date IS NULL, due_date ASC, created_at ASC LIMIT 1
    `).get(exceptId)
  }
}

module.exports = TaskModel
