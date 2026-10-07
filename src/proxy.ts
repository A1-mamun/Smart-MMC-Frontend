import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./services/currentUser";

/**
 * Routes that are part of the auth flow itself (visiting them while
 * signed in bounces you to your role's home). The `/free-classes`
 * landing is INTENTIONALLY not in this list — it handles all three
 * auth states inline (free user → content, paid user → CTA card,
 * anonymous → bounced to /free-classes/signin).
 *
 * `/free-classes/signin` and `/free-classes/signup` ARE in this list
 * for already-signed-in free users only — there's nothing for them
 * to fill in. Paid users (dashboard role) are allowed to land on
 * these pages so they can sign up a separate free account on their
 * existing mobile.
 */
const authRoutes = ["/signin", "/free-classes/signin", "/free-classes/signup"];

/**
 * Public-by-default routes the proxy must never gate. The free-class
 * routes are public so anonymous users can land on them and onboard
 * themselves — without this list, hitting `/free-classes` while
 * logged out would bounce the user to `/signin` (the regular
 * dashboard login), which is the wrong place.
 */
const publicRoutes = [
  "/free-classes",
  "/free-classes/signin",
  "/free-classes/signup",
];

/**
 * Per-role allowlist for protected paths. Free students (mobile-only
 * accounts who haven't been admitted to a paid course) get routed to
 * /free-classes — the standalone free-classes landing handles signup,
 * login and the content tree, no dashboard chrome required.
 */
const roleAccess: Record<string, RegExp[]> = {
  SUPER_ADMIN: [/^\/dashboard/, /^\/free-classes/, /^\/free-classes\/.*/],
  ADMIN: [/^\/dashboard/, /^\/free-classes/, /^\/free-classes\/.*/],
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
      // Anonymous user landing on the free-classes landing → bounce
      // straight to the dedicated signin page so the user doesn't
      // see a loading splash + client-side redirect flicker.
      if (pathname === "/free-classes") {
        return NextResponse.redirect(
          new URL("/free-classes/signin", request.url),
        );
      }
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL(`/signin?redirectPath=${pathname}`, request.url),
    );
  }

  if (authRoutes.includes(pathname)) {
    // /free-classes/signin and /free-classes/signup only bounce
    // already-authenticated free users (nothing for them to fill
    // in — they're already inside their account). Paid students
    // and admins are allowed to land here so they can sign up a
    // free account on their existing mobile.
    if (
      pathname === "/free-classes/signin" ||
      pathname === "/free-classes/signup"
    ) {
      if (userInfo.isFreeAccount) {
        return NextResponse.redirect(
          new URL(roleHome(userInfo), request.url),
        );
      }
      return NextResponse.next();
    }
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