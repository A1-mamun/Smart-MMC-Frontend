import { baseApi } from "@/redux/api/baseApi";
import { TAttendanceWithStudent } from "@/types/student";
import { TApiResponse } from "@/types/common";

type TCheckInResult = {
  student: { studentId: string; name: string; nickname?: string | null };
  attendanceId: string;
  /**
   * The day the attendance row was stamped for — the student's
   * dedicated class day. May equal the actual scan date (normal
   * check-in) or a different day (make-up swap).
   */
  date: string;
  /**
   * When set, the student physically scanned on a peer batch's day
   * and the row was recorded for their dedicated day. Carries the
   * actual scan date as an ISO yyyy-mm-dd string.
   */
  swapFromDate?: string | null;
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
        // The /attendance/check-in endpoint is gated by the backend's
        // DEVICE_SECRET — the barcode scanner page is opened on a
        // shared kiosk so we can't reuse the admin's JWT. Pull the
        // value from NEXT_PUBLIC_DEVICE_SECRET (must match backend .env).
        headers: {
          "x-device-secret":
            process.env.NEXT_PUBLIC_DEVICE_SECRET || "",
        },
      }),
      invalidatesTags: ["Attendance", "Dashboard"],
    }),
    manualCheckIn: build.mutation<TApiResponse<TCheckInResult>, { studentId: string; date?: string }>({
      query: (data) => ({
        url: "/attendance/manual",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Attendance", "Dashboard"],
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
      providesTags: ["Attendance"],
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
      providesTags: (_r, _e, { studentId }) => [
        { type: "Attendance", id: `STUDENT-${studentId}` },
        "Attendance",
      ],
    }),
    getAttendanceStats: build.query<TApiResponse<any>, void>({
      query: () => ({ url: "/attendance/stats", method: "GET" }),
    }),
    deleteAttendance: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/attendance/${id}`, method: "DELETE" }),
      invalidatesTags: ["Attendance", "Dashboard"],
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