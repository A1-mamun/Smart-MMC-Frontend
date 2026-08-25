import { jwtDecode } from "jwt-decode";
import { TUser, TUserRole } from "@/types/user";

type TDecoded = {
  userId: string;
  name: string;
  role: TUserRole;
  studentId: string;
  iat?: number;
  exp?: number;
};

export const verifyToken = (token: string): { user: TUser } => {
  const decoded = jwtDecode<TDecoded>(token);
  return {
    user: {
      id: decoded.userId,
      studentId: decoded.studentId,
      name: decoded.name,
      role: decoded.role,
      mustChangePassword: false,
      iat: decoded.iat,
      exp: decoded.exp,
    },
  };
};