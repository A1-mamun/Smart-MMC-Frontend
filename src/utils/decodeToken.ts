import { jwtDecode } from "jwt-decode";
import { TUser, TUserRole } from "@/types/user";

type TDecoded = {
  userId: string;
  name: string;
  role: TUserRole;
  // Mobile is the canonical identifier on the auth payload now; the
  // dropped `User.studentId` was replaced by `mobile` when sign-in
  // migrated to phone-number-based lookup.
  mobile: string;
  isFreeAccount?: boolean;
  iat?: number;
  exp?: number;
};

export const verifyToken = (token: string): { user: TUser } => {
  const decoded = jwtDecode<TDecoded>(token);
  return {
    user: {
      id: decoded.userId,
      mobile: decoded.mobile,
      name: decoded.name,
      role: decoded.role,
      mustChangePassword: false,
      isFreeAccount: decoded.isFreeAccount ?? false,
      iat: decoded.iat,
      exp: decoded.exp,
    },
  };
};