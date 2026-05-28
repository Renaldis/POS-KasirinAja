import { NextResponse, type NextRequest } from "next/server";

const authRoutes = ["/auth/login", "/auth/register"];

function hasSessionCookie(request: NextRequest) {
  return (
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token")
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = hasSessionCookie(request);
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname.startsWith("/auth/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/shifts/:path*",
    "/products/:path*",
    "/stocks/:path*",
    "/transactions/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/roles/:path*",
    "/audit-logs/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/auth/login",
    "/auth/register",
  ],
};
