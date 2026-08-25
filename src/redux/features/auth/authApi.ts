import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";

type TLoginPayload = { studentId: string; password: string };
type TChangePasswordPayload = { currentPassword: string; newPassword: string };
type TForgotPasswordPayload = { studentId: string };
type TResetPasswordPayload = { token: string; newPassword: string };

type TLoginData = {
  user: {
    id: string;
    studentId: string;
    name: string;
    role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
    mustChangePassword: boolean;
  };
  accessToken: string;
};

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TApiResponse<TLoginData>, TLoginPayload>({
      query: (data) => ({
        url: "/auth/sign-in",
        method: "POST",
        body: data,
      }),
    }),
    refreshToken: build.mutation<TApiResponse<{ accessToken: string }>, void>({
      query: () => ({
        url: "/auth/refresh-token",
        method: "POST",
      }),
    }),
    logout: build.mutation<TApiResponse<null>, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    changePassword: build.mutation<TApiResponse<null>, TChangePasswordPayload>({
      query: (data) => ({
        url: "/auth/change-password",
        method: "POST",
        body: data,
      }),
    }),
    forgotPassword: build.mutation<TApiResponse<null>, TForgotPasswordPayload>({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),
    resetPassword: build.mutation<TApiResponse<null>, TResetPasswordPayload>({
      query: (data) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: data,
      }),
    }),
    getMe: build.query<TApiResponse<any>, void>({
      query: () => ({ url: "/auth/me", method: "GET" }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
} = authApi;