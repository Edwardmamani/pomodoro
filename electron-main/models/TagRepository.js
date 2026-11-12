const { getConnection } = require('../db/connection')

class TagRepository {
  static link(joinTable, fkColumn, entityId, tagNames = []) {
    const db = getConnection()
    const find = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
    const insert = db.prepare('INSERT INTO tags (name) VALUES (?)')
    const link = db.prepare(`INSERT INTO ${joinTable} (${fkColumn}, tag_id) VALUES (?, ?)`)

    for (const name of tagNames) {
      const trimmed = String(name).trim()
      if (!trimmed) continue
      const existing = find.get(trimmed)
      link.run(entityId, existing ? existing.id : insert.run(trimmed).lastInsertRowid)
    }
  }
}

module.exports = TagRepository
