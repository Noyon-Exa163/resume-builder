import type { CurrentUser } from "@/lib/auth";

/**
 * Welcome email for an account an admin created with an initial password.
 * The password itself is NEVER emailed — the admin shares it directly, and
 * the user is pointed at Account settings to change it.
 */
export function welcomeEmailHtml({
  name,
  loginUrl,
}: {
  name: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c283c; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
    <div style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 32px;">
      <span style="color: #0072ED;">Exa</span><span style="color: #1c283c;">Resume</span>
    </div>
    <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
    <p style="font-size: 16px; margin-bottom: 16px;">An account has been created for you on ExaResume.</p>
    <p style="font-size: 16px; margin-bottom: 24px;">Sign in with the password shared with you — and change it to something personal from Account settings after your first sign-in.</p>
    <p style="margin: 32px 0;">
      <a href="${loginUrl}" style="background: #0072ED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; display: inline-block; font-size: 16px;">
        Sign In
      </a>
    </p>
    <p style="font-size: 14px; color: #45556c; margin-top: 32px;">
      If you didn't expect this email, you can safely ignore it.
    </p>
  </body>
</html>
`;
}

export function welcomeEmailText({
  name,
  loginUrl,
}: {
  name: string;
  loginUrl: string;
}): string {
  return `
ExaResume

Hi there,

An account has been created for you on ExaResume.

Sign in with the password shared with you — and change it to something personal from Account settings after your first sign-in.

Sign in: ${loginUrl}

If you didn't expect this email, you can safely ignore it.
`;
}
