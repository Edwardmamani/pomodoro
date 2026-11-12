const { getConnection } = require('./connection')
const MigrationV1 = require('./migrations/v1')
const MigrationV2 = require('./migrations/v2')
const MigrationV3 = require('./migrations/v3')
const MigrationV4 = require('./migrations/v4')

const DEFAULT_SETTINGS = {
  sound_enabled: 'true',
  notifications_enabled: 'true',
  locale: 'es',
  mcp_enabled: 'false',
  sound_volume: '75',
  do_not_disturb_auto: 'false',
  active_playlist_id: '',
  last_playlist_id: '',
  active_task_id: ''
}

class MigrationRunner {
  constructor() {
    this.steps = [
      { version: 1, migration: MigrationV1 },
      { version: 2, migration: MigrationV2 },
      { version: 3, migration: MigrationV3 },
      { version: 4, migration: MigrationV4 }
    ]
  }

  run() {
    const db = getConnection()
    const currentVersion = db.pragma('user_version', { simple: true })
    for (const step of this.steps) {
      if (currentVersion < step.version) {
        step.migration.apply(db)
      }
    }
    this.ensureDefaultSettings(db)
  }

  ensureDefaultSettings(db) {
    const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)')
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insert.run({ key, value })
      }
    })
    tx()
  }
}

const runner = new MigrationRunner()

module.exports = {
  MigrationRunner,
  runMigrations: () => runner.run(),
  DEFAULT_SETTINGS
}
