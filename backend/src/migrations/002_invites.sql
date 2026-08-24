CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  message TEXT,
  created_by TEXT,
  uses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
