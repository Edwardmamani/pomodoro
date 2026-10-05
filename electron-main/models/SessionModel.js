const { getConnection } = require('../db/connection')

const SNAPSHOT_KEY = 'timer_snapshot'

class SessionModel {
  get db() {
    return getConnection()
  }

  addAccumulatedMs(taskId, ms, atIso = new Date().toISOString()) {
    this.db
      .prepare(
        `
      UPDATE tasks SET
        accumulated_ms = accumulated_ms + ?,
        updated_at = ?
      WHERE id = ?
    `
      )
      .run(ms, atIso, taskId)
  }

  /** Inserta `count` sesiones de focus completadas y suma pomodoros a la tarea. */
  recordFocusSessions(count, { startedAt, endedAt, durationMs, taskId }) {
    const db = this.db
    const insert = db.prepare(
      `
      INSERT INTO pomodoro_sessions (
        period_type, started_at, ended_at, duration_ms, completed, task_id
      ) VALUES ('focus', ?, ?, ?, 1, ?)
    `
    )
    const bump = db.prepare(
      `
      UPDATE tasks SET
        completed_pomodoros = completed_pomodoros + 1,
        updated_at = ?
      WHERE id = ?
    `
    )
    const tx = db.transaction(() => {
      for (let i = 0; i < count; i++) {
        insert.run(startedAt, endedAt, durationMs, taskId)
        if (taskId) bump.run(endedAt, taskId)
      }
    })
    tx()
  }

  /** Cierra un periodo; en focus suma el pomodoro y el tramo no acreditado a la tarea. */
  recordCompletedPeriod({ periodType, startedAt, endedAt, durationMs, taskId, creditMs }) {
    const db = this.db
    const tx = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO pomodoro_sessions (
          period_type, started_at, ended_at, duration_ms, completed, task_id
        ) VALUES (?, ?, ?, ?, 1, ?)
      `
      ).run(periodType, startedAt, endedAt, durationMs, taskId)

      if (periodType === 'focus' && taskId) {
        db.prepare(
          `
          UPDATE tasks SET
            completed_pomodoros = completed_pomodoros + 1,
            accumulated_ms = accumulated_ms + ?,
            updated_at = ?
          WHERE id = ?
        `
        ).run(creditMs, endedAt, taskId)
      }
    })
    tx()
  }

  countCompletedByType(day) {
    const rows = this.db
      .prepare(
        `
        SELECT period_type, COUNT(*) AS n
        FROM pomodoro_sessions
        WHERE completed = 1
          AND date(started_at, 'localtime') = ?
        GROUP BY period_type
      `
      )
      .all(day)

    const counts = { focus: 0, short_break: 0, long_break: 0 }
    for (const row of rows) {
      if (row.period_type in counts) counts[row.period_type] = row.n
    }
    return counts
  }

  readSnapshot() {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SNAPSHOT_KEY)
    return row?.value || null
  }

  writeSnapshot(payload) {
    this.db
      .prepare(
        `
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `
      )
      .run(SNAPSHOT_KEY, payload)
  }

  clearSnapshot() {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(SNAPSHOT_KEY)
  }
}

module.exports = SessionModel
