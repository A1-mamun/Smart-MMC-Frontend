import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./services/currentUser";

const authRoutes = ["/signin"];

const roleAccess: Record<string, RegExp[]> = {
  SUPER_ADMIN: [/^\/dashboard/],
  ADMIN: [/^\/dashboard/],
  STUDENT: [/^\/dashboard\/student/, /^\/dashboard\/student\/.*/],
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const userInfo = getCurrentUser(request);

  if (!userInfo) {
    if (authRoutes.includes(pathname)) return NextResponse.next();
    return NextResponse.redirect(
      new URL(`/signin?redirectPath=${pathname}`, request.url),
    );
  }

  if (authRoutes.includes(pathname)) {
    const target =
      userInfo.role === "STUDENT" ? "/dashboard/student" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    const allowed = roleAccess[userInfo.role] || [];
    if (allowed.some((re) => re.test(pathname))) {
      return NextResponse.next();
    }
    const fallback =
      userInfo.role === "STUDENT" ? "/dashboard/student" : "/dashboard";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/signin", "/dashboard", "/dashboard/:path*"],
};