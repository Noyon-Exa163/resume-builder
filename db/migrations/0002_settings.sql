-- Admin settings (AI provider config, defaults), moved from Netlify Blobs to
-- Postgres so it works under plain `next dev` too — Netlify Blobs only works
-- when deployed on Netlify or run through `netlify dev` locally, which
-- surfaced as "Couldn't load AI settings" for anyone testing with plain
-- `npm run dev`. Single row keyed by a fixed id, same shape as the old blob.
-- Applied directly to the "Exabyting Resume Builder" Neon project via the
-- Neon MCP tools, same as db/migrations/0001_init.sql.

CREATE TABLE IF NOT EXISTS admin_settings (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
