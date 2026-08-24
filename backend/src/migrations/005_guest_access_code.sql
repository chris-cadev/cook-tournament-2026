ALTER TABLE guests ADD COLUMN access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_access_code ON guests (access_code);
