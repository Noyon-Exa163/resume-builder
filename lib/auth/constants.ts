/**
 * This account can never be deleted via the admin UI/API — it's the
 * permanent bootstrap admin, so there's always at least one way in.
 * Other admins can be created and deleted freely.
 */
export const PROTECTED_ADMIN_EMAIL = "khalid.hasan@exabyting.com";
