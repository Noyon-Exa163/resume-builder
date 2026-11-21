-- Add is_admin column to invite_tokens so invited users can be granted
-- admin access at invite time.
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invite_tokens_is_admin ON invite_tokens(is_admin);
