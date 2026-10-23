const { getConnection } = require('./connection')

function runSeed() {
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
  const link = db.prepare(
    'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)'
  )
  const insertPlaylist = db.prepare(`
    INSERT INTO playlists (service, name, external_url, external_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    const idiomas = insertTag.run('Idiomas').lastInsertRowid
    const dev = insertTag.run('Dev').lastInsertRowid
    const org = insertTag.run('Organización').lastInsertRowid
    const diseno = insertTag.run('Diseño').lastInsertRowid
    const lectura = insertTag.run('Lectura').lastInsertRowid

    const t1 = insertTask.run(
      'Estudiar inglés',
      'in_progress',
      'high',
      null,
      4,
      2,
      23 * 60 * 1000,
      4,
      4,
      2,
      2,
      3,
      11.0,
      now,
      now
    ).lastInsertRowid
    link.run(t1, idiomas)

    const t2 = insertTask.run(
      'Revisar documentación de API',
      'todo',
      'medium',
      null,
      2,
      1,
      15 * 60 * 1000,
      3,
      3,
      3,
      2,
      2,
      4.33,
      now,
      now
    ).lastInsertRowid
    link.run(t2, dev)

    const t3 = insertTask.run(
      'Escribir resumen semanal',
      'todo',
      'low',
      null,
      2,
      2,
      45 * 60 * 1000,
      2,
      2,
      3,
      1,
      1,
      1.67,
      now,
      now
    ).lastInsertRowid
    link.run(t3, org)

    const t4 = insertTask.run(
      'Preparar presentación cliente',
      'todo',
      'high',
      null,
      3,
      0,
      0,
      5,
      4,
      2,
      3,
      4,
      16.0,
      now,
      now
    ).lastInsertRowid
    link.run(t4, diseno)

    const t5 = insertTask.run(
      'Lectura técnica capítulo 4',
      'done',
      'medium',
      null,
      2,
      2,
      30 * 60 * 1000,
      3,
      2,
      2,
      1,
      1,
      3.5,
      now,
      now
    ).lastInsertRowid
    link.run(t5, lectura)

    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run('active_task_id', String(t1))

    const playlistId = insertPlaylist.run(
      'spotify',
      'Deep Focus Ambient — Midnight Rain',
      'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY',
      null,
      now
    ).lastInsertRowid

    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run('active_playlist_id', String(playlistId))
    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run('last_playlist_id', String(playlistId))
  })

  tx()
}

module.exports = { runSeed }
