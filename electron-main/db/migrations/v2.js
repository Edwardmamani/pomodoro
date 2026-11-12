class MigrationV2 {
  static apply(db) {
    const columns = db.pragma('table_info(tasks)').map((c) => c.name)
    if (!columns.includes('impact')) {
      db.exec(`
        ALTER TABLE tasks ADD COLUMN impact INTEGER NOT NULL DEFAULT 3;
        ALTER TABLE tasks ADD COLUMN urgency INTEGER NOT NULL DEFAULT 3;
        ALTER TABLE tasks ADD COLUMN effort INTEGER NOT NULL DEFAULT 3;
        ALTER TABLE tasks ADD COLUMN dependencies INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE tasks ADD COLUMN risk INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE tasks ADD COLUMN priority_score REAL NOT NULL DEFAULT 3.33;
      `)
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON tasks(priority_score);')
    db.pragma('user_version = 2')
  }
}

module.exports = MigrationV2
