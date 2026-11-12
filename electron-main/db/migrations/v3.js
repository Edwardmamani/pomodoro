class MigrationV3 {
  static apply(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
        estimated_pomodoros INTEGER NOT NULL DEFAULT 0,
        impact INTEGER NOT NULL DEFAULT 3,
        urgency INTEGER NOT NULL DEFAULT 3,
        effort INTEGER NOT NULL DEFAULT 3,
        dependencies INTEGER NOT NULL DEFAULT 1,
        risk INTEGER NOT NULL DEFAULT 1,
        priority_score REAL NOT NULL DEFAULT 3.33,
        days_of_week TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS routine_tags (
        routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (routine_id, tag_id)
      );
      CREATE INDEX IF NOT EXISTS idx_routine_tags_tag_id ON routine_tags(tag_id);
    `)

    const taskColumns = db.pragma('table_info(tasks)').map((c) => c.name)
    if (!taskColumns.includes('routine_id')) {
      db.exec('ALTER TABLE tasks ADD COLUMN routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE;')
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_routine_id ON tasks(routine_id);')
    db.pragma('user_version = 3')
  }
}

module.exports = MigrationV3
