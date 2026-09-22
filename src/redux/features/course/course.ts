import { baseApi } from "@/redux/api/baseApi";
import { TCourse } from "@/types/student";
import { TApiResponse } from "@/types/common";

type TBatchDayInput = {
  // Optional id — when set, the backend updates this BatchDay in place
  // instead of creating a new one, preserving StudentBatch.batchDayId FKs.
  id?: string;
  name: string;
  days: string[];
  times: string[];
};

type TCourseInput = {
  name?: string;
  description?: string;
  fee?: number;
  hscBatch?: string;
  isActive?: boolean;
  isCompleted?: boolean;
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
        // The Students list filters by `activeCoursesOnly`; any update to a
        // course (including isActive, isDeleted via soft-delete) can change
        // that membership, so the Student cache must invalidate too.
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
    toggleCourseActive: build.mutation<
      TApiResponse<TCourse>,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/course/${id}/toggle-active`,
        method: "PATCH",
        body: { isActive },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
        // Course isActive participates directly in the Students list
        // (`activeCoursesOnly` filter) and the SMS picker's count, so a
        // toggled course must invalidate the Student cache to refresh
        // those screens instantly. Without this the list only refreshes
        // on a manual reload.
        "Student",
        "Dashboard",
      ],
    }),
    // Dedicated lifecycle hook (vs the generic PATCH /:id) so we can
    // stamp completedAt/completedBy server-side and invalidate the
    // Student cache — flipping this flag un-gates students and the
    // admit page must reflect that immediately.
    markCourseCompleted: build.mutation<
      TApiResponse<TCourse>,
      { id: string; isCompleted?: boolean }
    >({
      query: ({ id, isCompleted }) => ({
        url: `/course/${id}/mark-completed`,
        method: "PATCH",
        body: { isCompleted: isCompleted ?? true },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
        // The student-service enrollment gate reads course.isCompleted,
        // so any change must invalidate the Student cache so the admit
        // form's error path reflects the new state without a manual
        // reload.
        "Student",
        "Dashboard",
      ],
    }),
  }),
});

export const {
  useGetAllCoursesQuery,
  useGetCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useToggleCourseActiveMutation,
  useMarkCourseCompletedMutation,
} = courseApi;
