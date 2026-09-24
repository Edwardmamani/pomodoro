const { getConnection } = require('../db/connection')

function localDay(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function recordFocusCompletion(day = localDay()) {
  const db = getConnection()
  db.prepare(
    `
    INSERT INTO activity_days (day, focus_sessions_count)
    VALUES (?, 1)
    ON CONFLICT(day) DO UPDATE SET
      focus_sessions_count = focus_sessions_count + 1
  `
  ).run(day)
}

function getStreak() {
  const db = getConnection()
  const rows = db
    .prepare(
      'SELECT day FROM activity_days WHERE focus_sessions_count > 0 ORDER BY day DESC'
    )
    .all()
  if (rows.length === 0) return { days: 0 }

  const daySet = new Set(rows.map((r) => r.day))
  let cursor = new Date()
  const today = localDay(cursor)
  const yesterday = localDay(new Date(Date.now() - 86400000))

  if (!daySet.has(today) && !daySet.has(yesterday)) {
    return { days: 0 }
  }

  if (!daySet.has(today)) {
    cursor = new Date(Date.now() - 86400000)
  }

  let streak = 0
  while (true) {
    const key = localDay(cursor)
    if (!daySet.has(key)) break
    streak += 1
    cursor = new Date(cursor.getTime() - 86400000)
  }

  return { days: streak }
}

module.exports = { getStreak, recordFocusCompletion, localDay }
