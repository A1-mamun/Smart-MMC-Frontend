import { baseApi } from "@/redux/api/baseApi";
import { TAttendanceWithStudent } from "@/types/student";
import { TApiResponse } from "@/types/common";

type TCheckInResult = {
  student: { studentId: string; name: string; nickname?: string | null };
  attendanceId: string;
  date: string;
  checkInAt: string;
  method: string;
  isFirstCheckIn: boolean;
  courseNames: string[];
  dueAmount: number;
  message: string;
};

const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    checkIn: build.mutation<TApiResponse<TCheckInResult>, { studentId: string; deviceId?: string }>({
      query: (data) => ({
        url: "/attendance/check-in",
        method: "POST",
        body: data,
      }),
    }),
    manualCheckIn: build.mutation<TApiResponse<TCheckInResult>, { studentId: string; date?: string }>({
      query: (data) => ({
        url: "/attendance/manual",
        method: "POST",
        body: data,
      }),
    }),
    getTodayAttendance: build.query<TApiResponse<TAttendanceWithStudent[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/attendance/today?${query.toString()}`, method: "GET" };
      },
    }),
    getStudentAttendance: build.query<TApiResponse<any>, { studentId: string; startDate?: string; endDate?: string; page?: number; limit?: number }>({
      query: ({ studentId, ...params }) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return {
          url: `/attendance/student/${studentId}?${query.toString()}`,
          method: "GET",
        };
      },
    }),
    getAttendanceStats: build.query<TApiResponse<any>, void>({
      query: () => ({ url: "/attendance/stats", method: "GET" }),
    }),
    deleteAttendance: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/attendance/${id}`, method: "DELETE" }),
    }),
  }),
});

export const {
  useCheckInMutation,
  useManualCheckInMutation,
  useGetTodayAttendanceQuery,
  useGetStudentAttendanceQuery,
  useGetAttendanceStatsQuery,
  useDeleteAttendanceMutation,
} = attendanceApi;