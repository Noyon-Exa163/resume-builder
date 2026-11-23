import { NextResponse, type NextRequest } from "next/server";
import { verifyUserSessionToken } from "@/lib/auth/userSession";

/**
 * Proxy (formerly "middleware" — renamed in Next 16, which now runs it on
 * the Node.js runtime by default; verifyUserSessionToken uses node:crypto).
 * Redirects unauthenticated requests to /login with ?next=<original path>.
 * Exempts: /login itself, /api/auth/*, the invite flow (invitees are logged
 * out by definition — the whole point of an invite), and static assets.
 */
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/invites",
  "/invite",
  // Crawler files — public/robots.txt must be readable by search engines
  // without a session, or the site's robots audit (and indexing rules)
  // breaks: requests for it were being redirected to /login.
  "/robots.txt",
  "/sitemap.xml",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("user_session")?.value;
  const session = verifyUserSessionToken(token);

  // Signed-in users don't need the auth pages — send them on their way (the
  // next param if it's an in-app path, otherwise the dashboard). Checked
  // BEFORE the public-path pass-through below: /login is public, but a
  // signed-in visitor should still be bounced to the app. The real pages
  // re-check access server-side as usual; this is just the cheap gate.
  if (session && pathname === "/login") {
    const requested = request.nextUrl.searchParams.get("next");
    const target =
      requested && requested.startsWith("/") && !requested.startsWith("/login")
        ? requested
        : "/";
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets, including the resume-template fonts
     *   (public/fonts/*.ttf) that react-pdf fetches while rendering a PDF —
     *   these must never redirect to /login, cookie or no cookie.
     * - ocr/ and pdfjs/ (scanned-PDF engine files, see
     *   scripts/copyOcrAssets.mjs) — fetched from inside a web worker,
     *   same reasoning as the fonts.
     */
    "/((?!_next/static|_next/image|favicon.ico|ocr/|pdfjs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|otf|woff|woff2)$).*)",
  ],
};
