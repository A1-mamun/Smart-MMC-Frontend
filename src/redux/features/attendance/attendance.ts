import { baseApi } from "@/redux/api/baseApi";
import { TAttendanceWithStudent } from "@/types/student";
import { TApiResponse } from "@/types/common";

type TCheckInResult = {
  // `mobile` is the per-account login identifier (replaces the dropped
  // `User.studentId`). For per-enrollment display, callers can join on
  // student.studentCourses[].studentCourseId instead.
  student: { mobile: string; name: string; nickname?: string | null };
  attendanceId: string;
  /**
   * The day the attendance row was stamped for — the student's
   * dedicated class day. Always equals the actual scan date now
   * that make-up attendance has been removed.
   */
  date: string;
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
      queryFn: async (data) => {
        // Hit our own Next.js server-side proxy (see
        // `app/api/scanner/check-in/route.ts`) instead of the backend
        // directly. The proxy attaches the device secret from a
        // server-only env var, so the secret never enters the client
        // bundle. We use `queryFn` (not `query`) so the request
        // bypasses `baseApi.baseUrl` (which points at the backend)
        // and resolves against the current page origin instead.
        const res = await fetch("/api/scanner/check-in", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });
        const payload = await res.json();
        return { data: payload as TApiResponse<TCheckInResult> };
      },
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
     * automatic-attendance view. Calls our own Next.js server-side
     * proxy (see `app/api/scanner/current-batch/route.ts`); the
     * proxy attaches the device secret from server-only env so it
     * never enters the client bundle. Uses `queryFn` (not `query`)
     * so the request bypasses `baseApi.baseUrl` (which points at
     * the backend) and resolves against the current page origin.
     */
    getCurrentBatch: build.query<TApiResponse<TCurrentBatch>, void>({
      queryFn: async () => {
        const res = await fetch("/api/scanner/current-batch", {
          method: "GET",
          credentials: "include",
        });
        const payload = await res.json();
        return { data: payload as TApiResponse<TCurrentBatch> };
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