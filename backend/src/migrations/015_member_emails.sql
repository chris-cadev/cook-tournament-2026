-- Clear old members (pre-launch, names-only format is obsolete)
UPDATE teams SET members = '[]';

-- Drop access_code column (no longer used in registration flow)
DROP INDEX IF EXISTS idx_teams_access_code;
ALTER TABLE teams DROP COLUMN access_code;

-- Recreate slug unique index (DROP COLUMN rewrites the table and drops indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug) WHERE slug IS NOT NULL;
