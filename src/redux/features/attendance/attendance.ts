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

/**
 * Shape of `GET /attendance/current-batch` — drives the kiosk
 * auto-attendance view. Tri-state:
 *   - `current`  — a batch is happening RIGHT NOW; the kiosk
 *     renders the live scanner against this batch.
 *   - `upcoming` — no batch in progress but one is scheduled
 *     later today; the kiosk shows a "next class in N min"
 *     pre-announcement.
 *   - `none`     — nothing is scheduled today; the kiosk shows a
 *     calm "no class right now" message.
 */
export type TCurrentBatch =
  | {
      kind: 'current';
      courseId: string;
      courseName: string;
      batchDayId: string;
      batchDayName: string;
      time: string;
      startsAtMinutes: number;
      endsAtMinutes: number;
      /**
       * Per-batch class duration in total minutes. Drives the live
       * progress bar / "X min remaining" countdown. The kiosk
       * computes `elapsed = now - startsAtMinutes` and `remaining =
       * endsAtMinutes - now` on every render from `Date.now()`, so a
       * page reload never resets the visible time to 0 — the
       * displayed value is always derived from the wall clock.
       */
      durationMinutes: number;
      /**
       * Whether this slot is currently admitting. Driven by the
       * admin's "Take attendance" toggle on the Courses page —
       * when false, the kiosk's scanner is disabled (the input
       * greys out and the 5-min check-in guard also rejects
       * server-side as a backstop). When the admin turns the slot
       * off mid-class, the next 60-second poll flips the kiosk
       * to the calm "no class right now" message.
       */
      slotEnabled: boolean;
      /**
       * Whether the admin's manual check-in window override is
       * currently open. When true, the kiosk accepts scans
       * for this slot regardless of the wall clock (the admin
       * opened the window early or kept it open past the 5-min
       * mark). The frontend uses this to show a "Window
       * override active" hint so the operator knows the
       * standard time window isn't in effect.
       */
      manualWindowOpen: boolean;
    }
  | {
      kind: 'upcoming';
      courseId: string;
      courseName: string;
      batchDayId: string;
      batchDayName: string;
      time: string;
      minutesUntilStart: number;
    }
  | { kind: 'none' };

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
    /**
     * Live "what's happening right now" poll for the kiosk /
     * automatic-attendance view. The endpoint is gated by the
     * shared `x-device-secret` header (same as `/check-in`) so we
     * can call it from the unauthenticated kiosk window without
     * exposing it to the public internet.
     */
    getCurrentBatch: build.query<TApiResponse<TCurrentBatch>, void>({
      query: () => ({
        url: "/attendance/current-batch",
        method: "GET",
        headers: {
          "x-device-secret": process.env.NEXT_PUBLIC_DEVICE_SECRET || "",
        },
      }),
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
  useGetCurrentBatchQuery,
  useGetStudentAttendanceQuery,
  useGetAttendanceStatsQuery,
  useDeleteAttendanceMutation,
} = attendanceApi;