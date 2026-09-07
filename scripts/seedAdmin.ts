/**
 * One-time bootstrap: create the first admin user so someone can log in and
 * provision other accounts (no self-serve signup).
 *
 *   npm run seed:admin
 *
 * Reads ADMIN_EMAIL, ADMIN_BOOTSTRAP_PASSWORD, and DATABASE_URL from the
 * environment (and from .env.local / .env if present). Not used by the app
 * at runtime.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(filename: string): void {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const trimmed = line.startsWith("export ")
      ? line.slice("export ".length)
      : line;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// Load before any dynamic import of lib/db/client (it reads DATABASE_URL at
// module init). Shell env wins; .env.local beats .env.
applyEnvFile(".env.local");
applyEnvFile(".env");

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!email) missing.push("ADMIN_EMAIL");
  if (!password) missing.push("ADMIN_BOOTSTRAP_PASSWORD");
  if (missing.length > 0) {
    console.error(
      `Missing required env: ${missing.join(", ")}. See .env.example.`,
    );
    process.exit(1);
  }

  const { sql } = await import("../lib/db/client");
  const { hashPassword } = await import("../lib/auth/password");
  const { createId } = await import("../lib/utils/ids");

  const existing = await sql`
    SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1
  `;
  if (existing.length > 0) {
    console.log(`Admin user ${email} already exists; nothing to do.`);
    return;
  }

  const id = createId();
  const passwordHash = hashPassword(password);
  await sql`
    INSERT INTO users (id, email, password_hash, is_admin)
    VALUES (${id}, ${email}, ${passwordHash}, true)
  `;
  console.log(`Created admin user ${email} (id: ${id}).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`seedAdmin failed: ${message}`);
  process.exit(1);
});
