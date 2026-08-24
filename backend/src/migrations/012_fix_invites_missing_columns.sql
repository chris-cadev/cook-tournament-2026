-- Add missing team_id, used_by, used_at columns to invites table
-- (from 003_invites.sql that was never applied due to IF NOT EXISTS on pre-existing table)
ALTER TABLE invites ADD COLUMN team_id INTEGER;
ALTER TABLE invites ADD COLUMN used_by TEXT;
ALTER TABLE invites ADD COLUMN used_at TEXT;
