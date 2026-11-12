const { localDay, calculateUrgencyFromDueDate, getDayOfWeek } = require('../lib/date')
const PriorityCalculator = require('../lib/PriorityCalculator')
const RoutineModel = require('./RoutineModel')

class TaskSyncService {
  constructor(taskModel) {
    this.taskModel = taskModel
    this.lastSyncDay = null
  }

  needsDailySync() {
    return this.lastSyncDay !== localDay()
  }

  syncDailyUrgencies(force = false) {
    const today = localDay()
    if (!force && this.lastSyncDay === today) return

    const db = this.taskModel.db
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get()) {
      return
    }

    this.lastSyncDay = today
    this.syncDailyRoutines(today)

    const openTasks = db
      .prepare(
        `SELECT id, due_date, impact, urgency, effort, dependencies, risk, priority_score
         FROM tasks WHERE status NOT IN ('done', 'cancelled') AND due_date IS NOT NULL`
      )
      .all()
    if (!openTasks.length) return

    const updateStmt = db.prepare('UPDATE tasks SET urgency = ?, priority_score = ?, updated_at = ? WHERE id = ?')
    const now = new Date().toISOString()

    db.transaction(() => {
      for (const t of openTasks) {
        const newUrg = calculateUrgencyFromDueDate(t.due_date, today)
        const newScore = PriorityCalculator.calculateScore(t.impact, newUrg, t.effort, t.dependencies, t.risk)
        if (newUrg !== t.urgency || newScore !== t.priority_score) {
          updateStmt.run(newUrg, newScore, now, t.id)
        }
      }
    })()
  }

  syncDailyRoutines(today = localDay()) {
    const db = this.taskModel.db
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'routines'").get()) {
      return
    }

    const activeRoutines = db.prepare('SELECT * FROM routines WHERE is_active = 1').all()
    if (!activeRoutines.length) return

    const currentDayOfWeek = getDayOfWeek(today)
    const checkTaskStmt = db.prepare('SELECT id FROM tasks WHERE routine_id = ? AND due_date = ? LIMIT 1')
    const getTagsStmt = db.prepare(
      'SELECT g.name FROM tags g JOIN routine_tags rt ON rt.tag_id = g.id WHERE rt.routine_id = ?'
    )
    const insertTaskStmt = db.prepare(`
      INSERT INTO tasks (
        title, status, priority, due_date, estimated_pomodoros,
        completed_pomodoros, accumulated_ms, impact, urgency, effort,
        dependencies, risk, priority_score, routine_id, created_at, updated_at
      ) VALUES (?, 'todo', ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    db.transaction(() => {
      for (const r of activeRoutines) {
        if (!RoutineModel.matchesDay(r.days_of_week, currentDayOfWeek)) continue
        if (checkTaskStmt.get(r.id, today)) continue

        const tags = getTagsStmt.all(r.id).map((row) => row.name)
        const urg = calculateUrgencyFromDueDate(today, today)
        const score = PriorityCalculator.calculateScore(r.impact, urg, r.effort, r.dependencies, r.risk)

        const taskId = insertTaskStmt.run(
          r.title, r.priority, today, r.estimated_pomodoros,
          r.impact, urg, r.effort, r.dependencies, r.risk,
          score, r.id, now, now
        ).lastInsertRowid

        this.taskModel.linkTags(taskId, tags)
      }
    })()
  }
}

module.exports = TaskSyncService
