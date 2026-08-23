CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sandwich_name TEXT NOT NULL,
  captain_email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  members TEXT DEFAULT '[]',
  equipment_needs TEXT,
  station TEXT,
  status TEXT DEFAULT 'pending',
  registered_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS judges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL UNIQUE,
  name TEXT,
  accessed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  judge_anonymous_id TEXT NOT NULL,
  category TEXT NOT NULL,
  value INTEGER NOT NULL CHECK(value >= 1 AND value <= 10),
  notes TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(team_id, judge_anonymous_id, category)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  sender_id INTEGER,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages (channel, created_at);

CREATE TABLE IF NOT EXISTS event_config (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  event_date TEXT,
  event_title TEXT DEFAULT 'The Crust Competition 2026',
  event_description TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  scoring_categories TEXT DEFAULT '[]',
  judge_password TEXT DEFAULT '',
  team_password TEXT DEFAULT '',
  landing_page_content TEXT DEFAULT '',
  revealed_categories TEXT DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO event_config (id) VALUES (1);
