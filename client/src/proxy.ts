import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard (Next.js `proxy` convention, formerly `middleware`). The JWT lives in a readable cookie so the edge can check it without
 * a server session — a deliberate simplification for this scope (PRD §13). The
 * cookie's contents are never trusted here: presence only gates navigation, and
 * the API verifies the signature on every request.
 */
/** Mirrors the server's AUTH_ENABLED. Set both to false for an open local demo. */
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

export function proxy(request: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();

  const token = request.cookies.get("sentriq_token")?.value;
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
