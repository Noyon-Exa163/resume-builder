import postgres from "postgres";

/**
 * Shared Postgres client (server-only — never import from client components).
 * Schema lives in db/migrations/*.sql. This is the one place DATABASE_URL is
 * read; everything else imports `sql` from here.
 *
 * Uses postgres.js (node-postgres) over TCP so the app runs against a local
 * PostgreSQL (docker compose) under plain `next dev`, instead of requiring a
 * Neon cloud endpoint like the old @neondatabase/serverless driver.
 *
 * `Sql` is deliberately loose-typed so every existing `sql\`...\`` call site
 * keeps working unchanged: it resolves to an array of rows, and `begin` runs
 * a callback inside a transaction using postgres.js's `sql.begin` API.
 */
export interface Sql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  begin<T>(cb: (tx: Sql) => T | Promise<T>): Promise<T>;
  /** Raw SQL with no parameters or caching — for standalone scripts that
   *  execute whole files (the migration runner). Never build queries from
   *  user input through this. */
  unsafe(query: string): Promise<unknown[]>;
  /** Closes the connection pool. Long-lived server code never calls this —
   *  it exists for standalone scripts (e.g. seedAdmin) so the process can
   *  exit instead of waiting on the idle pool. */
  end(options?: { timeout?: number }): Promise<void>;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

const globalForSql = globalThis as unknown as {
  __resume_builder_sql?: ReturnType<typeof postgres>;
};

if (!globalForSql.__resume_builder_sql) {
  globalForSql.__resume_builder_sql = postgres(getDatabaseUrl(), {
    // Serverless-safe pool settings (Netlify + Neon):
    // - small, short-lived pools — each function instance gets its own
    //   pool, and instances scale with traffic;
    // - prepare: false — Neon's pooled endpoint runs PgBouncer in
    //   transaction mode, which cannot serve named prepared statements;
    //   disabling them avoids intermittent "prepared statement does not
    //   exist" failures in production. The local dev cost is negligible.
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    prepare: false,
  });
}

export const sql = globalForSql.__resume_builder_sql as unknown as Sql;

/**
 * postgres.js returns `jsonb` columns as strings, not parsed objects
 * (unlike @neondatabase/serverless). Normalize before Zod validation so
 * call sites don't need to remember to parse.
 */
export function parseJsonb(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}
