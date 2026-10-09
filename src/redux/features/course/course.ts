import { baseApi } from "@/redux/api/baseApi";
import { TCourse, TCourseSeats, TCourseStatus } from "@/types/student";
import { TApiResponse } from "@/types/common";

type TBatchDayInput = {
  // Optional id — when set, the backend updates this BatchDay in place
  // instead of creating a new one, preserving StudentBatch.batchDayId FKs.
  id?: string;
  name: string;
  days: string[];
  times: string[];
  /**
   * Per-slot admit-enabled flag, parallel to `times[]`. Optional —
   * the courses page surfaces the toggle as a Switch on every slot;
   * the backend defaults to "all ON" for legacy rows and pads new
   * slots to ON so the operator never accidentally starts a new
   * slot in the disabled state.
   */
  slotStates?: boolean[];
  /**
   * Per-batch class duration in total minutes (e.g. 75 for "1h 15m").
   * Optional — `null`/undefined falls back to the legacy 60-min
   * default at the backend. Surfaced in the courses page form so
   * the admin can set it per-BatchDay.
   */
  durationMinutes?: number | null;
};

type TCourseInput = {
  name?: string;
  description?: string;
  fee?: number;
  hscBatch?: string;
  // NULL clears the cap (uncapped). Omit the key entirely to leave the
  // backend's existing value untouched.
  totalSeats?: number | null;
  // Course lifecycle stage. Most admins use the dedicated `setCourseStatus`
  // endpoint (single-click segmented control on the Courses page); we
  // expose it here so the generic edit modal can also touch it.
  status?: TCourseStatus;
  // Admin override for the enrollment gate. The status-set endpoint keeps
  // this consistent with `status` (COMPLETE → true, anything else → false);
  // pass it here to decouple the two without changing status.
  isAllowAdmitAnotherCourse?: boolean;
  batchDays?: TBatchDayInput[];
};

const courseApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllCourses: build.query<TApiResponse<TCourse[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/course?${query.toString()}`, method: "GET" };
      },
      // Lets any course mutation force a refetch everywhere the list is
      // mounted (e.g. the cascading Course filter on the Students page).
      providesTags: (result) =>
        result
          ? [
              ...(result.data?.map((c) => ({
                type: "Course" as const,
                id: c.id,
              })) ?? []),
              { type: "Course" as const, id: "LIST" },
            ]
          : [{ type: "Course" as const, id: "LIST" }],
    }),
    getCourseById: build.query<TApiResponse<TCourse>, string>({
      query: (id) => ({ url: `/course/${id}`, method: "GET" }),
      // Lets the cascading filter's per-course query refetch instantly when
      // that course is updated/created/deleted/toggled from elsewhere.
      providesTags: (_r, _e, id) => [{ type: "Course", id }],
    }),
    /**
     * Per-slot seat-cap read-out. The admit-form picker consumes this
     * to disable full (batchDay, batchTime) slots before submission.
     *
     * Tag is its own `CourseSeats` family so course-level mutations
     * don't auto-refetch seat counts (they'd be a no-op anyway since
     * mutations don't change the per-slot enrollment). Admit
     * mutations invalidate this tag on success so the picker refetches.
     */
    getCourseSeats: build.query<TApiResponse<TCourseSeats>, string>({
      query: (id) => ({ url: `/course/${id}/seats`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "CourseSeats", id }],
    }),
    createCourse: build.mutation<TApiResponse<TCourse>, TCourseInput>({
      query: (data) => ({ url: "/course", method: "POST", body: data }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Course", id: result.data?.id },
              { type: "Course", id: "LIST" },
              "Dashboard",
            ]
          : [{ type: "Course", id: "LIST" }, "Dashboard"],
    }),
    updateCourse: build.mutation<
      TApiResponse<TCourse>,
      { id: string; data: TCourseInput }
    >({
      query: ({ id, data }) => ({
        url: `/course/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
        // Any update to a course (including isDeleted via soft-delete) can
        // change which students are returned by the Students list, so
        // the Student cache must invalidate too.
        "Student",
        "Dashboard",
      ],
    }),
    deleteCourse: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/course/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
        // Soft-deleting a course can move students into the "inactive-only"
        // bucket; refresh the Students list / SMS picker immediately.
        "Student",
        "Dashboard",
      ],
    }),
    // Single-click course status transition from the segmented control
    // on the Courses page. The server keeps `isAllowAdmitAnotherCourse`
    // consistent with `status` (COMPLETE → on, anything else → off) so
    // the gate and the lifecycle badge can't drift under the standard
    // flow. Invalidates the Student cache because the enrollment gate
    // in student.service reads `course.isAllowAdmitAnotherCourse` and
    // the admit form must reflect the new state without a manual reload.
    setCourseStatus: build.mutation<
      TApiResponse<TCourse>,
      { id: string; status: TCourseStatus }
    >({
      query: ({ id, status }) => ({
        url: `/course/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
        "Student",
        "Dashboard",
      ],
    }),
    // Independent manual override for the enrollment gate. The
    // Courses page surfaces this as a single-click toggle button next
    // to the status segmented control so admins can open or close the
    // gate without touching the status enum. The override is
    // short-term — the next setStatus transition reapplies the
    // standard mapping (COMPLETE → on; anything else → off).
    toggleAdmitAnotherCourse: build.mutation<
      TApiResponse<TCourse>,
      { id: string; isAllowAdmitAnotherCourse: boolean }
    >({
      query: ({ id, isAllowAdmitAnotherCourse }) => ({
        url: `/course/${id}/admit-another-course`,
        method: "PATCH",
        body: { isAllowAdmitAnotherCourse },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: id },
        { type: "Course", id: "LIST" },
        // Student gate re-reads `isAllowAdmitAnotherCourse` so this
        // also must invalidate the Student cache.
        "Student",
        "Dashboard",
      ],
    }),
    // Per-slot "Take attendance" toggle. The Courses page renders a
    // small switch next to every times[] entry; flipping one ON
    // auto-disables every other slot in the same BatchDay so the
    // kiosk can never serve two slots concurrently. The endpoint
    // returns the updated BatchDay row (with the new slotStates).
    toggleBatchSlot: build.mutation<
      TApiResponse<TCourse>,
      {
        id: string;
        batchDayId: string;
        slotIndex: number;
        enabled: boolean;
      }
    >({
      query: ({ id, batchDayId, slotIndex, enabled }) => ({
        url: `/course/${id}/slot-toggle`,
        method: "PATCH",
        body: { batchDayId, slotIndex, enabled },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: id },
        { type: "Course", id: "LIST" },
        // The kiosk polls current-batch and the check-in endpoint
        // reads `slotStates` to decide whether to accept scans. Both
        // must refetch when a slot toggles.
        "Student",
        "Dashboard",
      ],
    }),
    // Per-slot "check-in window override" toggle. The Courses page
    // surfaces this as a Switch next to the existing "Take
    // attendance" switch — admins flip it on to open the kiosk
    // window early (admit an early arrival) or keep it open
    // past the 5-min mark (class was delayed). The endpoint
    // toggles just `manualWindowOverride[i]` and leaves
    // `slotStates` untouched, so the override is independent
    // of the admit gate.
    setSlotWindowOverride: build.mutation<
      TApiResponse<TCourse>,
      {
        id: string;
        batchDayId: string;
        slotIndex: number;
        open: boolean;
      }
    >({
      query: ({ id, batchDayId, slotIndex, open }) => ({
        url: `/course/${id}/slot-window-override`,
        method: "PATCH",
        body: { batchDayId, slotIndex, open },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: id },
        { type: "Course", id: "LIST" },
        // The kiosk's `getCurrentBatch` reads `manualWindowOverride`
        // to short-circuit the 5-min guard when the override is
        // active. Invalidate Student + Dashboard so the kiosk
        // picks up the change on its next poll.
        "Student",
        "Dashboard",
      ],
    }),
  }),
});

export const {
  useGetAllCoursesQuery,
  useGetCourseByIdQuery,
  useGetCourseSeatsQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useSetCourseStatusMutation,
  useToggleAdmitAnotherCourseMutation,
  useToggleBatchSlotMutation,
  useSetSlotWindowOverrideMutation,
} = courseApi;
