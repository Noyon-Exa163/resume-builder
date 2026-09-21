-- Resume versions: a snapshot saved after a person has stopped changing a
-- resume for 30 minutes, keeping the last 5 per resume. Versions are per
-- person: each user's own idle timer runs independently of everyone else's.
--
-- resume_version_pending holds each user's latest save until their timer
-- runs out; the app turns due rows into resume_versions rows the next time
-- that resume is saved or its versions are read (see lib/db/resumeVersions.ts).
-- There is no background job. `number` counts versions per resume and keeps
-- increasing after old ones are pruned, so titles read V1, V2, ...
-- Apply to the "Exabyting Resume Builder" Neon project via the Neon MCP tools,
-- same convention as the earlier migrations. Saving keeps working without it;
-- versions are simply not recorded.

CREATE TABLE IF NOT EXISTS resume_version_pending (
  resume_id text NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resume_id, user_id)
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id bigserial PRIMARY KEY,
  resume_id text NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  number integer NOT NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (resume_id, number)
);
