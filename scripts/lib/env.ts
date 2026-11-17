import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads DATABASE_URL & friends from .env.local / .env for standalone scripts
 * (shell env always wins). Shared by seedAdmin and the migration runner.
 */
export function applyEnvFile(filename: string): void {
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

export function loadScriptEnv(): void {
  applyEnvFile(".env.local");
  applyEnvFile(".env");
}
