/**
 * One place for the call-then-check-error pattern every API-backed storage
 * module repeated: fetch, throw a readable ApiError (built from the JSON
 * error body, carrying the status code) on non-OK responses, parse JSON on
 * success.
 */
export class ApiError extends Error {
  /** HTTP status of the failed response. */
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  url: string,
  init: RequestInit & { /** Message thrown when the response has no JSON error. */
    fallbackError?: string },
): Promise<T> {
  const { fallbackError = "The request failed.", ...initRest } = init;
  const res = await fetch(url, initRest);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new ApiError(
      body?.error || `${fallbackError} (status: ${res.status})`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** apiFetch for endpoints that answer empty bodies. */
export async function apiFetchVoid(
  url: string,
  init: RequestInit & { fallbackError?: string },
): Promise<void> {
  const { fallbackError = "The request failed.", ...initRest } = init;
  const res = await fetch(url, initRest);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new ApiError(
      body?.error || `${fallbackError} (status: ${res.status})`,
      res.status,
    );
  }
}
