import { baseApi } from "@/redux/api/baseApi";
import { TStudent } from "@/types/student";
import { TApiResponse } from "@/types/common";

const studentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    admitStudent: build.mutation<TApiResponse<{ student: TStudent; credentials: { studentId: string; initialPassword: string } }>, any>({
      query: (data) => ({
        url: "/student/admit",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Student", "Dashboard", "Activity"],
    }),
    getAllStudents: build.query<TApiResponse<TStudent[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/student?${query.toString()}`, method: "GET" };
      },
      providesTags: ["Student"],
    }),
    getStudentById: build.query<TApiResponse<TStudent>, string>({
      query: (id) => ({ url: `/student/${id}`, method: "GET" }),
      providesTags: (_result, _err, id) => [{ type: "Student", id }],
    }),
    updateStudent: build.mutation<TApiResponse<TStudent>, { id: string; data: Partial<TStudent> }>({
      query: ({ id, data }) => ({
        url: `/student/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        "Student",
        { type: "Student", id },
        "Activity",
      ],
    }),
    deleteStudent: build.mutation<TApiResponse<null>, { id: string; hard?: boolean }>({
      query: ({ id, hard }) => ({
        url: `/student/${id}`,
        method: "DELETE",
        body: hard ? { hard: true } : {},
      }),
      invalidatesTags: (_result, _err, { id }) => [
        "Student",
        { type: "Student", id },
        "Activity",
      ],
    }),
    getMyProfile: build.query<TApiResponse<TStudent>, void>({
      query: () => ({ url: "/student/me/profile", method: "GET" }),
      providesTags: ["Student"],
    }),
  }),
});

export const {
  useAdmitStudentMutation,
  useGetAllStudentsQuery,
  useGetStudentByIdQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useGetMyProfileQuery,
} = studentApi;