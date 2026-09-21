-- Fixed-window request counters for rate limiting (login and AI routes).
-- One row per (rule, identity, window); rows are deleted once expired.
-- The app fails open if this table is missing, so login keeps working, but
-- limits only take effect once it exists.
-- Apply to the "Exabyting Resume Builder" Neon project via the Neon MCP tools,
-- same convention as the earlier migrations.

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON rate_limits(expires_at);
