import { jwtDecode } from "jwt-decode";
import { NextRequest } from "next/server";

interface DecodedToken {
  userId: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  studentId: string;
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