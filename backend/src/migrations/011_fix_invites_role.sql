-- Add missing columns to invites table (from 003_invites.sql that was skipped)
ALTER TABLE invites ADD COLUMN role TEXT NOT NULL DEFAULT 'guest';
ALTER TABLE invites ADD COLUMN team_id INTEGER;
ALTER TABLE invites ADD COLUMN used_by TEXT;
ALTER TABLE invites ADD COLUMN used_at TEXT;
