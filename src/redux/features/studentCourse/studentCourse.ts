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
      // Invalidate Student + Dashboard + CourseSeats so any cached
      // `getAllStudents` response (including the free-roster query
      // `?isFreeAccount=true`) refetches the moment a free student is
      // enrolled in a paid course. Without this, the user could see
      // a freshly-converted student still appear on
      // /dashboard/free-students until the 60s server cache expires.
      invalidatesTags: (_r, _e, arg) => [
        "Student",
        "Dashboard",
        "Activity",
        { type: "CourseSeats", id: arg.courseId },
      ],
    }),
    completeCourse: build.mutation<TApiResponse<any>, string>({
      query: (id) => ({
        url: `/student-course/complete/${id}`,
        method: "POST",
      }),
      invalidatesTags: ["Student", "Activity"],
    }),
    getStudentCourses: build.query<TApiResponse<any[]>, string>({
      query: (studentId) => ({
        url: `/student-course/student/${studentId}`,
        method: "GET",
      }),
    }),
    unenroll: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/student-course/${id}`, method: "DELETE" }),
      // Unenrolling flips a student's enrollment state, which both
      // the /student list (free vs paid bucketing) and the admin
      // dashboard KPIs depend on. Invalidate both so the next render
      // pulls fresh data instead of showing a stale roster / KPI.
      invalidatesTags: ["Student", "Dashboard", "Activity"],
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