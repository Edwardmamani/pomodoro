class MigrationV4 {
  static apply(db) {
    const hasYt = db.prepare("SELECT COUNT(*) AS c FROM playlists WHERE service = 'youtube'").get().c
    if (hasYt === 0) {
      const now = new Date().toISOString()
      const insertPl = db.prepare(
        'INSERT INTO playlists (service, name, external_url, external_id, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      const yt1 = insertPl.run(
        'youtube',
        'Lofi Girl — Beats to relax/study to',
        'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        'jfKfPfyJRdk',
        now
      ).lastInsertRowid
      insertPl.run(
        'youtube',
        'Deep Focus — Ambient Study Music',
        'https://www.youtube.com/watch?v=WPni755-Krg',
        'WPni755-Krg',
        now
      )
      insertPl.run(
        'youtube',
        'Synthwave Radio — Chill Beats',
        'https://www.youtube.com/watch?v=4xDzrJKXOOY',
        '4xDzrJKXOOY',
        now
      )
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_playlist_id', ?)").run(String(yt1))
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_playlist_id', ?)").run(String(yt1))
    }
    db.pragma('user_version = 4')
  }
}

module.exports = MigrationV4
