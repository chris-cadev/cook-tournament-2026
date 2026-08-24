-- Idempotent: safe to re-run
ALTER TABLE teams ADD COLUMN slug TEXT;

UPDATE teams SET slug = lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(name, ' ', '-'), '.', ''), ',', ''), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'), 'ü', 'u'), '&', 'and')) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug) WHERE slug IS NOT NULL;
