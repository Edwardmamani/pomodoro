const { getConnection } = require('./connection')

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

function runMigrations() {
  const db = getConnection()
  const version = db.pragma('user_version', { simple: true })

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('blocked','todo','in_progress','done','cancelled')),
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('high','medium','low')),
        due_date TEXT,
        estimated_pomodoros INTEGER NOT NULL DEFAULT 0,
        completed_pomodoros INTEGER NOT NULL DEFAULT 0,
        accumulated_ms INTEGER NOT NULL DEFAULT 0,
        impact INTEGER NOT NULL DEFAULT 3,
        urgency INTEGER NOT NULL DEFAULT 3,
        effort INTEGER NOT NULL DEFAULT 3,
        dependencies INTEGER NOT NULL DEFAULT 1,
        risk INTEGER NOT NULL DEFAULT 1,
        priority_score REAL NOT NULL DEFAULT 3.33,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_type TEXT NOT NULL
          CHECK (period_type IN ('focus','short_break','long_break','stopwatch')),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        name TEXT NOT NULL,
        external_url TEXT NOT NULL,
        external_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity_days (
        day TEXT PRIMARY KEY,
        focus_sessions_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON tasks(priority_score);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON pomodoro_sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON pomodoro_sessions(task_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_type_completed ON pomodoro_sessions(period_type, completed);
      CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
    `)
    db.pragma('user_version = 1')
  }

  if (version < 2) {
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
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON tasks(priority_score);
    `)
    db.pragma('user_version = 2')
  }

  if (version < 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('high','medium','low')),
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
      db.exec(`
        ALTER TABLE tasks ADD COLUMN routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE;
      `)
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_routine_id ON tasks(routine_id);
    `)
    db.pragma('user_version = 3')
  }

  const insert = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)'
  )
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run({ key, value })
    }
  })
  tx()
}

module.exports = { runMigrations, DEFAULT_SETTINGS }
