import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./services/currentUser";

/**
 * Routes that are part of the auth flow itself (visiting them while
 * signed in bounces you to your role's home). The `/free-classes` page
 * is INTENTIONALLY not in this list — anonymous users should be able to
 * land on `/free-classes` and see the signup / sign-in toggle inline.
 */
const authRoutes = ["/signin"];

/**
 * Public-by-default routes the proxy must never gate. The /free-classes
 * landing handles its own 3-state UI (signup form for anon, content for
 * signed-in). Add the literal marker `false` to `authRequired` below so the
 * middleware doesn't redirect anonymous visitors to /signin first.
 */
const publicRoutes = ["/free-classes"];

/**
 * Per-role allowlist for protected paths. Free students (mobile-only
 * accounts who haven't been admitted to a paid course) get routed to
 * /free-classes — the standalone free-classes landing handles signup,
 * login and the content tree, no dashboard chrome required.
 */
const roleAccess: Record<string, RegExp[]> = {
  SUPER_ADMIN: [/^\/dashboard/, /^\/free-classes/],
  ADMIN: [/^\/dashboard/, /^\/free-classes/],
  STUDENT: [
    /^\/dashboard\/student/, /^\/dashboard\/student\/.*/,
    /^\/free-classes/, /^\/free-classes\/.*/,
  ],
};

/**
 * Where each role lands when the proxy needs to bounce them — either
 * because they hit a path they can't see, or because they're already
 * signed in and clicked the "Sign In" button.
 *
 *   - Paid STUDENT → /dashboard/student
 *   - Free STUDENT → /free-classes (their content home)
 *   - ADMIN/SUPER_ADMIN → /dashboard
 */
const roleHome = (user: { role: string; isFreeAccount?: boolean }) => {
  if (user.role === "STUDENT") {
    return user.isFreeAccount ? "/free-classes" : "/dashboard/student";
  }
  return "/dashboard";
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const userInfo = getCurrentUser(request);

  if (!userInfo) {
    if (authRoutes.includes(pathname)) return NextResponse.next();
    // Public-by-default routes: anonymous users see the inline signup
    // form instead of being bounced to /signin.
    if (publicRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL(`/signin?redirectPath=${pathname}`, request.url),
    );
  }

  if (authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL(roleHome(userInfo), request.url));
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/free-classes")) {
    const allowed = roleAccess[userInfo.role] || [];
    if (allowed.some((re) => re.test(pathname))) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(roleHome(userInfo), request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/signin", "/dashboard", "/dashboard/:path*", "/free-classes", "/free-classes/:path*"],
};