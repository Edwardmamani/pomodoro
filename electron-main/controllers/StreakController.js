const StreakModel = require('../models/StreakModel')
const { localDay } = require('../lib/date')

const DAY_MS = 86400000

class StreakController {
  constructor() {
    this.streak = new StreakModel()
  }

  get() {
    return { ok: true, data: this.getStreak() }
  }

  /** Días consecutivos con focus; la racha sigue viva si ayer hubo actividad. */
  getStreak() {
    const days = this.streak.activeDays()
    if (days.size === 0) return { days: 0 }

    const today = localDay()
    const yesterday = localDay(new Date(Date.now() - DAY_MS))
    if (!days.has(today) && !days.has(yesterday)) {
      return { days: 0 }
    }

    let cursor = days.has(today) ? new Date() : new Date(Date.now() - DAY_MS)
    let streak = 0
    while (days.has(localDay(cursor))) {
      streak += 1
      cursor = new Date(cursor.getTime() - DAY_MS)
    }
    return { days: streak }
  }
}

module.exports = new StreakController()
