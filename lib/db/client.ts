import { neon } from "@neondatabase/serverless";

/**
 * Shared Neon Postgres client (server-only — never import from client
 * components). Schema lives in db/migrations/0001_init.sql. This is the one
 * place DATABASE_URL is read; everything else imports `sql` from here.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

export const sql = neon(getDatabaseUrl());
