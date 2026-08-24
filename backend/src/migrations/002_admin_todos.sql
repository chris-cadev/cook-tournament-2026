CREATE TABLE IF NOT EXISTS admin_todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_markdown TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO admin_todos (id, content_markdown) VALUES (1, '');
