import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, roleHomePath, SESSION_COOKIE } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);

  const isStaffRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/waiter") ||
    pathname.startsWith("/kitchen");
  const isLogin = pathname === "/login";

  if (isStaffRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isStaffRoute) {
    const allowed =
      (pathname.startsWith("/admin") && session.role === "ADMIN") ||
      (pathname.startsWith("/waiter") && session.role === "WAITER") ||
      (pathname.startsWith("/kitchen") && session.role === "KITCHEN");

    if (!allowed) {
      return NextResponse.redirect(
        new URL(roleHomePath(session.role), request.url),
      );
    }
  }

  if (isLogin && session) {
    return NextResponse.redirect(
      new URL(roleHomePath(session.role), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/waiter/:path*", "/kitchen/:path*"],
};
