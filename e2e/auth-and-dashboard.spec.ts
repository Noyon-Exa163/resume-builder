import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Playwright does not load `.env.local` on its own. Pull bootstrap creds
 * from there (without overriding a real shell env) so `npx playwright test`
 * works against the seeded admin.
 */
function loadEnvFile(filename: string): void {
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

loadEnvFile(".env.local");
loadEnvFile(".env");

function requireAdminCreds(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are not set. Copy them into .env.local and run `npm run seed:admin` so this smoke test can log in as the bootstrap admin. Refusing to wait on the login form.",
    );
  }
  return { email, password };
}

test.describe("auth and dashboard smoke", () => {
  test("unauthenticated / redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  });

  test("login, create resume, preview, list, logout", async ({ page }) => {
    test.setTimeout(60_000);
    const { email, password } = requireAdminCreds();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => url.pathname === "/");

    await expect(
      page.getByRole("heading", { name: "My Resumes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New Resume" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();

    await page.getByRole("button", { name: "New Resume" }).click();
    await page.waitForURL(/\/editor\/[^/]+$/);
    const resumeId = page.url().match(/\/editor\/([^/?#]+)/)?.[1];
    expect(resumeId, "expected an editor resume id in the URL").toBeTruthy();

    await expect(
      page.getByRole("heading", { name: "Personal Information" }),
    ).toBeVisible();
    await expect(page.locator(".live-preview-pane")).toBeVisible();

    await page.getByLabel("Full Name").fill("Ada Lovelace");
    await expect(page.locator("canvas.pdf-canvas-viewer__page")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "← My Resumes" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(
      page.locator(`a.resume-card__link[href="/editor/${resumeId}"]`),
    ).toBeVisible();

    await page.getByRole("button", { name: "Log Out" }).click();
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  });
});
