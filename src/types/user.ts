export type TUserRole = "SUPER_ADMIN" | "ADMIN" | "STUDENT";

export type TUser = {
  id: string;
  // Mobile is the canonical login handle now — `studentId` (the old
  // per-user string) was dropped from the User model. Per-enrollment
  // IDs live on StudentCourse.studentCourseId and are surfaced
  // through the student / receipt types, not here.
  mobile: string;
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