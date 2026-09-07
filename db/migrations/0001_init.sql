-- Initial schema for the Neon-backed resume builder (post-pivot from
-- IndexedDB-only + no-auth). Applied directly to the "Exabyting Resume
-- Builder" Neon project (under the "Zibon Exa" org) via the Neon MCP tools.
-- Kept here so the schema is reproducible and reviewable in git.

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resumes (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resumes_user_id_idx ON resumes(user_id);
