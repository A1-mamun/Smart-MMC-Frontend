export type TUserRole = "SUPER_ADMIN" | "ADMIN" | "STUDENT";

export type TUser = {
  id: string;
  studentId: string;
  name: string;
  nickname?: string | null;
  role: TUserRole;
  mustChangePassword: boolean;
  // Free-class lifecycle flag. Surfaced via the access token so the
  // frontend can route free users straight to /dashboard/free-classes
  // without a /auth/me roundtrip.
  isFreeAccount?: boolean;
  iat?: number;
  exp?: number;
};