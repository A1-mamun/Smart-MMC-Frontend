import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";

const studentCourseApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    enrollStudent: build.mutation<TApiResponse<any>, { studentId: string; courseId: string }>({
      query: (data) => ({
        url: "/student-course/enroll",
        method: "POST",
        body: data,
      }),
    }),
    completeCourse: build.mutation<TApiResponse<any>, string>({
      query: (id) => ({
        url: `/student-course/complete/${id}`,
        method: "POST",
      }),
    }),
    getStudentCourses: build.query<TApiResponse<any[]>, string>({
      query: (studentId) => ({
        url: `/student-course/student/${studentId}`,
        method: "GET",
      }),
    }),
    unenroll: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/student-course/${id}`, method: "DELETE" }),
    }),
    getAllEnrollments: build.query<TApiResponse<any[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/student-course?${query.toString()}`, method: "GET" };
      },
    }),
  }),
});

export const {
  useEnrollStudentMutation,
  useCompleteCourseMutation,
  useGetStudentCoursesQuery,
  useUnenrollMutation,
  useGetAllEnrollmentsQuery,
} = studentCourseApi;