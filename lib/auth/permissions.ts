import { isProtectedAdmin } from "./constants";

/**
 * Org-wide resume management is limited to the protected Super Admin
 * account — other admins manage users and settings, not every resume.
 */
export function canManageAllResumes(email: string): boolean {
  return isProtectedAdmin(email);
}

/** The caller's relationship to a resume, or null if they have none. */
export function resolveResumeAccess(args: {
  userId: string;
  userEmail: string;
  ownerId: string;
  sharePermission: "viewer" | "editor" | null;
}): "owner" | "editor" | "viewer" | "admin" | null {
  if (args.ownerId === args.userId) return "owner";
  if (canManageAllResumes(args.userEmail)) return "admin";
  if (args.sharePermission === "editor" || args.sharePermission === "viewer") {
    return args.sharePermission;
  }
  return null;
}
