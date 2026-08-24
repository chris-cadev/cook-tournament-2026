-- Judges as users: add anonymous_id column
ALTER TABLE users ADD COLUMN anonymous_id TEXT;

-- Scoring categories (normalized)
CREATE TABLE IF NOT EXISTS scoring_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  weight REAL NOT NULL DEFAULT 1.0,
  max_points INTEGER NOT NULL DEFAULT 10,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Admin tasks
CREATE TABLE IF NOT EXISTS admin_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  opened_at TEXT,
  open_count INTEGER DEFAULT 0
);

-- Email schedules
CREATE TABLE IF NOT EXISTS email_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_filter TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  created_at TEXT DEFAULT (datetime('now'))
);
