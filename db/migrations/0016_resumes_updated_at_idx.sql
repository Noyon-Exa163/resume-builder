-- The dashboard's hot query (lib/db/resumeQueries.ts listResumesForUser)
-- orders by updated_at DESC and filters per user; until now only
-- resumes(user_id) existed, so every dashboard render sorted the matched
-- rows, and the Super Admin branch (WHERE true OR ...) full-scanned the
-- table. This composite index serves both the per-user filter and the sort.
CREATE INDEX IF NOT EXISTS resumes_user_id_updated_at_idx
  ON resumes(user_id, updated_at DESC);
