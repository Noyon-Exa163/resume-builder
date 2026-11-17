/**
 * Applies db/migrations/*.sql in filename order, tracking what has run in a
 * schema_migrations table so each migration executes exactly once.
 *
 *   npm run db:migrate             apply pending migrations
 *   npm run db:migrate -- --baseline
 *                                 mark every existing migration as applied
 *                                 WITHOUT executing — for adopting the runner
 *                                 on a database that was migrated manually
 *                                 (e.g. the production Neon project)
 *
 * Each migration runs inside its own transaction; a failure aborts and leaves
 * already-applied migrations intact. A Postgres advisory lock serialises
 * concurrent runs (e.g. two deploys racing). Safe to re-run at any time.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadScriptEnv } from "./lib/env";

loadScriptEnv();

const MIGRATIONS_DIR = resolve(process.cwd(), "db/migrations");
const ADVISORY_LOCK_KEY = 918_273_645; // arbitrary, constant per project

async function main(): Promise<void> {
  const baseline = process.argv.includes("--baseline");

  const { sql } = await import("../lib/db/client");

  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;

  await sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY})`;
  try {
    const applied = new Set(
      (
        await sql`SELECT id FROM schema_migrations`
      ).map((row) => (row as { id: string }).id),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    const pending = files.filter((name) => !applied.has(name));

    if (pending.length === 0) {
      console.log(
        `Database is up to date (${applied.size} migration(s) applied).`,
      );
      return;
    }

    if (baseline) {
      await sql.begin(async (tx) => {
        for (const name of pending) {
          await tx`INSERT INTO schema_migrations (id) VALUES (${name})`;
        }
      });
      console.log(
        `Baselined ${pending.length} migration(s) without executing:\n` +
          pending.map((name) => `  - ${name}`).join("\n"),
      );
      return;
    }

    for (const name of pending) {
      const contents = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
      console.log(`Applying ${name}…`);
      await sql.begin(async (tx) => {
        await tx.unsafe(contents);
        await tx`INSERT INTO schema_migrations (id) VALUES (${name})`;
      });
    }
    console.log(`Applied ${pending.length} migration(s). Database is up to date.`);
  } finally {
    await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
    await sql.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:migrate failed: ${message}`);
  process.exit(1);
});
