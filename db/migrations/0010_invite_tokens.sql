CREATE TABLE IF NOT EXISTS invite_tokens (
  id text PRIMARY KEY,
  email text NOT NULL,
  invited_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);

-- One active invite per email at a time: re-inviting replaces the old token.
-- Enforced at the application layer (delete existing tokens for the email
-- before inserting a new one).
