CREATE TABLE IF NOT EXISTS invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest',
  uses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
