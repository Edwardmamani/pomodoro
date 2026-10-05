const { getConnection } = require('../db/connection')

class PlaylistModel {
  get db() {
    return getConnection()
  }

  list() {
    return this.db
      .prepare('SELECT * FROM playlists ORDER BY created_at DESC')
      .all()
  }

  getById(id) {
    return this.db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) || null
  }

  create({ service, name, externalUrl, externalId }) {
    const now = new Date().toISOString()
    return this.db
      .prepare(
        `
      INSERT INTO playlists (service, name, external_url, external_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(service, name, externalUrl, externalId, now).lastInsertRowid
  }
}

module.exports = PlaylistModel
