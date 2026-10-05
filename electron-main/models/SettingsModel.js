const { getConnection } = require('../db/connection')
const { DEFAULT_SETTINGS } = require('../db/migrations')

class SettingsModel {
  // Conexión perezosa: main.js carga los controladores antes de app.setName, que fija la ruta de la BD.
  get db() {
    return getConnection()
  }

  getAll() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all()
    const settings = { ...DEFAULT_SETTINGS }
    for (const row of rows) {
      settings[row.key] = row.value
    }
    return SettingsModel.normalize(settings)
  }

  get(key) {
    return this.getAll()[key]
  }

  setMany(partial) {
    const db = this.db
    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    const tx = db.transaction((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        upsert.run({ key, value: String(value) })
      }
    })
    tx(partial)
    return this.getAll()
  }

  resetDefaults() {
    return this.setMany(DEFAULT_SETTINGS)
  }

  static normalize(raw) {
    return {
      focus_minutes: Number(raw.focus_minutes) || 25,
      short_break_minutes: Number(raw.short_break_minutes) || 5,
      long_break_minutes: Number(raw.long_break_minutes) || 15,
      pomodoros_until_long_break: Number(raw.pomodoros_until_long_break) || 4,
      sound_enabled: raw.sound_enabled === 'true' || raw.sound_enabled === true,
      notifications_enabled:
        raw.notifications_enabled === 'true' || raw.notifications_enabled === true,
      locale: raw.locale || 'es',
      mcp_enabled: raw.mcp_enabled === 'true' || raw.mcp_enabled === true,
      sound_volume: Number(raw.sound_volume) || 75,
      do_not_disturb_auto:
        raw.do_not_disturb_auto === 'true' || raw.do_not_disturb_auto === true,
      attenuate_on_break:
        raw.attenuate_on_break === 'true' || raw.attenuate_on_break === true,
      active_playlist_id: raw.active_playlist_id
        ? Number(raw.active_playlist_id)
        : null,
      last_playlist_id: raw.last_playlist_id
        ? Number(raw.last_playlist_id)
        : null,
      active_task_id: raw.active_task_id ? Number(raw.active_task_id) : null
    }
  }
}

module.exports = SettingsModel
