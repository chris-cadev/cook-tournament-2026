ALTER TABLE teams ADD COLUMN access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_access_code ON teams (access_code);
