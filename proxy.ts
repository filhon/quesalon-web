import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get("session");

    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match /dashboard and all sub-paths.
     * Exclude: /api, /_next/static, /_next/image, /login, static files.
     */
    "/dashboard/:path*",
  ],
};
