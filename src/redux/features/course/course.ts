import { baseApi } from "@/redux/api/baseApi";
import { TCourse } from "@/types/student";
import { TApiResponse } from "@/types/common";

type TBatchDayInput = {
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
    }),
    getCourseById: build.query<TApiResponse<TCourse>, string>({
      query: (id) => ({ url: `/course/${id}`, method: "GET" }),
    }),
    createCourse: build.mutation<TApiResponse<TCourse>, TCourseInput>({
      query: (data) => ({ url: "/course", method: "POST", body: data }),
    }),
    updateCourse: build.mutation<TApiResponse<TCourse>, { id: string; data: TCourseInput }>({
      query: ({ id, data }) => ({
        url: `/course/${id}`,
        method: "PATCH",
        body: data,
      }),
    }),
    deleteCourse: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/course/${id}`, method: "DELETE" }),
    }),
    toggleCourseActive: build.mutation<TApiResponse<TCourse>, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/course/${id}/toggle-active`,
        method: "PATCH",
        body: { isActive },
      }),
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