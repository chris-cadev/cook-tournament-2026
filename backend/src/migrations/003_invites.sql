CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL DEFAULT 'admin',
  role TEXT NOT NULL DEFAULT 'guest',
  team_id INTEGER,
  used_by TEXT,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
