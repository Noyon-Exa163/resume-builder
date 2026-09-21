-- First version for every resume that existed before versioning: V1 holds the
-- resume exactly as it is now, credited to its owner and dated by its last
-- update, so any later change can be restored back to this state.
-- Safe to re-run: only resumes that have no version yet are touched.
-- Requires 0008_resume_versions.sql. Applied to the "Exabyting Resume Builder"
-- Neon project via the Neon MCP tools, same convention as earlier migrations.

INSERT INTO resume_versions (resume_id, number, user_id, snapshot, created_at)
SELECT r.id, 1, r.user_id, r.data, r.updated_at
FROM resumes r
WHERE NOT EXISTS (
  SELECT 1 FROM resume_versions v WHERE v.resume_id = r.id
);
