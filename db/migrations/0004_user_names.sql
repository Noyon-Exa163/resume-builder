-- Display name for each user (shown next to their avatar). Nullable so users
-- created before this migration keep working; the UI falls back to the email.
-- Applied directly to the "Exabyting Resume Builder" Neon project via the
-- Neon MCP tools, same convention as the earlier migrations.

ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;

UPDATE users SET name = 'Khalid Hasan Zibon' WHERE email = 'khalid.hasan@exabyting.com';
UPDATE users SET name = 'Habibur Rahman' WHERE email = 'habibur@exabyting.com';
UPDATE users SET name = 'Md. Akash' WHERE email = 'md.akash@exabyting.com';
UPDATE users SET name = 'Saiful Islam Rana' WHERE email = 'saiful@exabyting.com';
