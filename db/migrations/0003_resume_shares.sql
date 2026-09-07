-- Resume sharing: grants another user viewer/editor access to a resume they
-- don't own. Applied directly to the "Exabyting Resume Builder" Neon project
-- via the Neon MCP tools, same convention as 0001_init.sql/0002_settings.sql.

CREATE TABLE IF NOT EXISTS resume_shares (
  resume_id text NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  shared_with_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('viewer', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resume_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS resume_shares_user_id_idx ON resume_shares(shared_with_user_id);
