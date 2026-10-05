const { getConnection } = require('../db/connection')

class StreakModel {
  get db() {
    return getConnection()
  }

  recordFocusCompletion(day) {
    this.db
      .prepare(
        `
      INSERT INTO activity_days (day, focus_sessions_count)
      VALUES (?, 1)
      ON CONFLICT(day) DO UPDATE SET
        focus_sessions_count = focus_sessions_count + 1
    `
      )
      .run(day)
  }

  activeDays() {
    const rows = this.db
      .prepare(
        'SELECT day FROM activity_days WHERE focus_sessions_count > 0 ORDER BY day DESC'
      )
      .all()
    return new Set(rows.map((r) => r.day))
  }
}

module.exports = StreakModel
