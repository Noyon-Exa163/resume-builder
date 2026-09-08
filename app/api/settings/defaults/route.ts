import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { postgresSettingsStore } from "@/lib/storage/settings/postgresStore";
import { resolveTemplateId } from "@/templates/ids";

/**
 * GET /api/settings/defaults — the admin-chosen default template (and
 * nothing else). Any authenticated user may call this so a New Resume
 * action can stamp the right template without reading AI API keys.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await postgresSettingsStore.get();
  return NextResponse.json({
    defaultTemplateId: resolveTemplateId(settings.defaultTemplateId),
  });
}
