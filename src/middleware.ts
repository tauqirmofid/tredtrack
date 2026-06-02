import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicPaths = ["/login", "/signup", "/api/register", "/api/auth"];
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (pathname.startsWith("/dashboard")) {
    // NextAuth v5 sets this cookie when logged in
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");
    if (!hasSession) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|uploads|.*\\..*).*)"],
};
