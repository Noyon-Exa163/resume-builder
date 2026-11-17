-- Server-side session revocation.
--
-- Session tokens embed the user's session_version; getCurrentUser rejects a
-- token whose version is behind the column. Bumping the column invalidates
-- every existing token for that user — done on password change (re-issuing a
-- fresh token for the current session so the user stays logged in) and on
-- logout, which makes logout a true revocation instead of only clearing the
-- cookie on one device.

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
