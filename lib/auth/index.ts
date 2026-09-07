export interface CurrentUser {
  id: string;
  role: "guest" | "admin";
}

/**
 * No-op today — there is no login yet. Every call site that will eventually
 * need a real session (settings access, future per-user resume storage)
 * already calls through this function, so swapping in real Google OAuth
 * (@exabyting.com) later means changing this one function, not its callers.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  return { id: "guest", role: "guest" };
}
