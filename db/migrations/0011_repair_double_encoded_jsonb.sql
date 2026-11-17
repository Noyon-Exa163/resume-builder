-- Repair double-encoded jsonb rows.
--
-- The Neon serverless driver accepted pre-stringified JSON in
-- ${JSON.stringify(x)}::jsonb parameters, but postgres.js binds a JS string
-- as a text parameter, so the ::jsonb cast stored the JSON text as a jsonb
-- *string scalar* (jsonb_typeof = 'string') instead of an object. Every
-- write path now binds the object directly; this migration unwraps rows
-- written the old way. `#>> '{}'` extracts the root scalar as text, which
-- is then re-cast to jsonb. Idempotent: object rows don't match the guard.

UPDATE resumes
SET data = (data #>> '{}')::jsonb
WHERE jsonb_typeof(data) = 'string';

UPDATE admin_settings
SET data = (data #>> '{}')::jsonb
WHERE jsonb_typeof(data) = 'string';

UPDATE resume_versions
SET snapshot = (snapshot #>> '{}')::jsonb
WHERE jsonb_typeof(snapshot) = 'string';

UPDATE resume_version_pending
SET snapshot = (snapshot #>> '{}')::jsonb
WHERE jsonb_typeof(snapshot) = 'string';
