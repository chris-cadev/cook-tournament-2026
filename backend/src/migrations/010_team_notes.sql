CREATE TABLE IF NOT EXISTS team_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL UNIQUE REFERENCES teams(id),
  content TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);
