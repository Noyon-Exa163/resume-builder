import type { CurrentUser } from "@/lib/auth";

export function inviteEmailHtml({
  inviteUrl,
}: {
  inviteUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c283c; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
    <div style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 32px;">
      <span style="color: #0072ED;">Exa</span><span style="color: #1c283c;">Resume</span>
    </div>
    <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
    <p style="font-size: 16px; margin-bottom: 16px;">You've been invited to join ExaResume.</p>
    <p style="font-size: 16px; margin-bottom: 24px;">Click the button below to set your password and complete your profile:</p>
    <p style="margin: 32px 0;">
      <a href="${inviteUrl}" style="background: #0072ED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; display: inline-block; font-size: 16px;">
        Set Up Your Account
      </a>
    </p>
    <p style="font-size: 14px; color: #45556c; margin-top: 32px;">
      This invite expires in 7 days. If you didn't expect this invite, you can safely ignore this email.
    </p>
  </body>
</html>
`;
}

export function inviteEmailText({
  inviteUrl,
}: {
  inviteUrl: string;
}): string {
  return `
ExaResume

Hi there,

You've been invited to join ExaResume.

Click the link below to set your password and complete your profile:
${inviteUrl}

This invite expires in 7 days. If you didn't expect this invite, you can safely ignore this email.
`;
}

export function inviterDisplayName(user: CurrentUser | null): string {
  if (!user) return "Someone";
  return user.name || user.email.split("@")[0];
}
