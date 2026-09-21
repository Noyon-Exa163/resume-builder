-- Per-user blobatar customization. Both nullable: null means "derive from the
-- email", which is what every existing user gets. Hue is degrees (0-359);
-- expression is a key from lib/avatar (validated in the API, not the DB).
-- Apply to the "Exabyting Resume Builder" Neon project via the Neon MCP tools,
-- same convention as the earlier migrations, BEFORE deploying the code that
-- reads these columns.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_hue smallint;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_expression text;
