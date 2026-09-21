-- Edit history for each resume: who changed it and when. Saves by the same
-- person within a few minutes are folded into one entry (see
-- lib/db/resumeHistory.ts) so autosave doesn't flood the timeline.
-- user_id is nullable so an entry survives its author being deleted.
-- Apply to the "Exabyting Resume Builder" Neon project via the Neon MCP tools,
-- same convention as the earlier migrations. Saving keeps working without it;
-- history is simply not recorded.

CREATE TABLE IF NOT EXISTS resume_history (
  id bigserial PRIMARY KEY,
  resume_id text NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'edited')),
  saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resume_history_resume_saved_idx
  ON resume_history(resume_id, saved_at DESC);
