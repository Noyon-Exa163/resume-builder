import { FALLBACK_TEMPLATE_ID, resolveTemplateId } from "@/templates/ids";

/**
 * Reads the admin default template for new resumes. Falls back to the
 * registry default if the request fails (offline, 401, malformed body).
 * Client-only — the matching route is /api/settings/defaults.
 */
export async function fetchDefaultTemplateId(): Promise<string> {
  try {
    const res = await fetch("/api/settings/defaults");
    if (!res.ok) return FALLBACK_TEMPLATE_ID;
    const body = (await res.json()) as { defaultTemplateId?: string };
    return resolveTemplateId(body.defaultTemplateId);
  } catch {
    return FALLBACK_TEMPLATE_ID;
  }
}
