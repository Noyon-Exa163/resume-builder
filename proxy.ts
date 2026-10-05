import { NextResponse, type NextRequest } from "next/server";
import { verifyUserSessionToken } from "@/lib/auth/userSession";

/**
 * Proxy (formerly "middleware" — renamed in Next 16, which now runs it on
 * the Node.js runtime by default; verifyUserSessionToken uses node:crypto).
 * Redirects unauthenticated requests to /login with ?next=<original path>.
 * Exempts: /login itself, /api/auth/*, and static assets.
 */
const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("user_session")?.value;
  const session = verifyUserSessionToken(token);

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
