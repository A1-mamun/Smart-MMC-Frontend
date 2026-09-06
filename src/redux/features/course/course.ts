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
        "Dashboard",
      ],
    }),
    deleteCourse: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/course/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
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
} = courseApi;
