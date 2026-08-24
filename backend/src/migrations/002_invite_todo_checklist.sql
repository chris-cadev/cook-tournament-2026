CREATE TABLE IF NOT EXISTS invite_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  referrer_name TEXT NOT NULL DEFAULT 'Guest',
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

ALTER TABLE event_config ADD COLUMN todo_list TEXT DEFAULT '[]';
ALTER TABLE teams ADD COLUMN checklist TEXT DEFAULT '[]';
