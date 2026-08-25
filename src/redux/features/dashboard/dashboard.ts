import { baseApi } from "@/redux/api/baseApi";
import { TAdminDashboardData, TStudentDashboardData } from "@/types/dashboard";
import { TApiResponse } from "@/types/common";

const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminDashboard: build.query<TApiResponse<TAdminDashboardData>, void>({
      query: () => ({ url: "/dashboard/admin", method: "GET" }),
    }),
    getStudentDashboard: build.query<TApiResponse<TStudentDashboardData>, void>({
      query: () => ({ url: "/dashboard/student", method: "GET" }),
    }),
  }),
});

export const { useGetAdminDashboardQuery, useGetStudentDashboardQuery } =
  dashboardApi;