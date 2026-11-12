const { getConnection } = require('./connection')
const { SEED_TAGS, SEED_TASKS, SEED_PLAYLISTS } = require('./seedData')

class DatabaseSeeder {
  run() {
    const db = getConnection()
    const count = db.prepare('SELECT COUNT(*) AS c FROM tasks').get().c
    if (count > 0) return

    const now = new Date().toISOString()
    const insertTag = db.prepare('INSERT INTO tags (name) VALUES (?)')
    const insertTask = db.prepare(`
      INSERT INTO tasks (
        title, status, priority, due_date, estimated_pomodoros,
        completed_pomodoros, accumulated_ms, impact, urgency, effort,
        dependencies, risk, priority_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const linkTag = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
    const insertPlaylist = db.prepare(
      'INSERT INTO playlists (service, name, external_url, external_id, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    const upsertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

    const tx = db.transaction(() => {
      const tagIds = {}
      for (const name of SEED_TAGS) {
        tagIds[name] = insertTag.run(name).lastInsertRowid
      }

      for (const t of SEED_TASKS) {
        const id = insertTask.run(
          t.title,
          t.status,
          t.priority,
          null,
          t.estimated,
          t.completed,
          t.accumulatedMs,
          t.impact,
          t.urgency,
          t.effort,
          t.dependencies,
          t.risk,
          t.score,
          now,
          now
        ).lastInsertRowid
        linkTag.run(id, tagIds[t.tag])
        if (t.isActive) upsertSetting.run('active_task_id', String(id))
      }

      for (const p of SEED_PLAYLISTS) {
        const id = insertPlaylist.run(p.service, p.name, p.url, p.externalId, now).lastInsertRowid
        if (p.isDefault) {
          upsertSetting.run('active_playlist_id', String(id))
          upsertSetting.run('last_playlist_id', String(id))
        }
      }
    })

    tx()
  }
}

const seeder = new DatabaseSeeder()

module.exports = {
  DatabaseSeeder,
  runSeed: () => seeder.run()
}
