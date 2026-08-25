export type TUserRole = "SUPER_ADMIN" | "ADMIN" | "STUDENT";

export type TUser = {
  id: string;
  studentId: string;
  name: string;
  nickname?: string | null;
  role: TUserRole;
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
};