-- Add max_uses and notes to invites table for richer invite management
ALTER TABLE invites ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invites ADD COLUMN notes TEXT;

-- Add invite_code to guests table to link guest registrations to invites
ALTER TABLE guests ADD COLUMN invite_code TEXT;
