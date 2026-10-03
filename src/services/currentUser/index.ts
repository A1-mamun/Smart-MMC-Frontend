import { jwtDecode } from "jwt-decode";
import { NextRequest } from "next/server";

interface DecodedToken {
  userId: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  studentId: string;
  // Surfaced from the backend so the proxy can route free students to
  // /dashboard/free-classes instead of /dashboard/student. Mirrors
  // src/types/user.ts and the backend TJwtPayload.
  isFreeAccount?: boolean;
  iat?: number;
  exp?: number;
}

export const getCurrentUser = (request: NextRequest): DecodedToken | null => {
  try {
    const token = request.cookies.get("refreshToken")?.value;
    if (!token) return null;
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
};