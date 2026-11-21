import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { postgresSettingsStore } from "@/lib/storage/settings/postgresStore";
import { AdminSettingsInputSchema } from "@/lib/storage/settings/types";

/**
 * GET /api/settings — read admin app settings (AI provider config, defaults).
 * PUT /api/settings — replace admin app settings.
 * Both admin-only; API keys must never reach a non-admin client.
 */

function requireAdmin(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  // 401 for no session at all, 403 for a signed-in non-admin — keeps client
  // handling and auth monitoring consistent with the rest of the API.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET() {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const settings = await postgresSettingsStore.get();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = AdminSettingsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", details: parsed.error.issues },
      { status: 400 },
    );
  }

  await postgresSettingsStore.set(parsed.data);
  return NextResponse.json(parsed.data);
}
