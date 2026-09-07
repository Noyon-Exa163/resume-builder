/**
 * Client-side entry point for AI-assisted import. Talks only to the
 * `/api/import/ai-parse` route — never to `lib/ai`/`SettingsStore` directly,
 * both of which are server-only (API keys must not reach the browser).
 */
export async function parseResumeWithAi(
  rawText: string,
  customInstruction?: string,
): Promise<{ json: unknown; raw: string }> {
  const res = await fetch("/api/import/ai-parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText, customInstruction }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `AI import failed (status ${res.status})`);
  }

  return res.json();
}
