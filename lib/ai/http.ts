/**
 * Shared HTTP / JSON helpers for provider adapters. Not a public API.
 */

export const EXTRACT_MAX_TOKENS = 8192;
export const DEFAULT_CHAT_MAX_TOKENS = 2048;
export const TEST_MAX_TOKENS = 16;
export const TEST_USER_MESSAGE = "Reply with the single word ok.";

export async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  if (!body) return response.statusText || `HTTP ${response.status}`;
  try {
    const json: unknown = JSON.parse(body);
    const message = extractErrorField(json);
    if (message) return message;
  } catch {
    // body is not JSON — fall through to the raw snippet
  }
  return body.slice(0, 500);
}

function extractErrorField(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const root = json as Record<string, unknown>;
  if (typeof root.message === "string") return root.message;
  const error = root.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const nested = error as Record<string, unknown>;
    if (typeof nested.message === "string") return nested.message;
  }
  return undefined;
}

export function httpError(
  provider: string,
  status: number,
  detail: string,
): Error {
  return new Error(`${provider} API error (${status}): ${detail}`);
}

/**
 * Parse model text as JSON. On failure return null — extractResumeData still
 * returns `{ json, raw }` and leaves ResumeDataSchema validation to aiParser.
 */
export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function requireApiKey(apiKey: string, provider: string): void {
  if (!apiKey.trim()) {
    throw new Error(`${provider} API key is missing.`);
  }
}

export function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}
