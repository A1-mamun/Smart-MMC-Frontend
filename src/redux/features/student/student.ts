import { baseApi } from "@/redux/api/baseApi";
import {
  TStudent,
  TStudentCredentials,
  TAdmitStudentPayload,
  TEnrollExistingStudentPayload,
} from "@/types/student";
import { TApiResponse } from "@/types/common";

const studentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    admitStudent: build.mutation<
      TApiResponse<{ student: TStudent; credentials: TStudentCredentials }>,
      TAdmitStudentPayload
    >({
      query: (data) => ({
        url: "/student/admit",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Student", "Dashboard", "Activity"],
    }),
    // Dedicated endpoint for the "old student → new course" branch in
    // the admit form. Same response shape as `admitStudent` so the
    // credentials card can render identically regardless of which
    // endpoint produced the data.
    enrollExistingStudent: build.mutation<
      TApiResponse<{ student: TStudent; credentials: TStudentCredentials }>,
      TEnrollExistingStudentPayload
    >({
      query: (data) => ({
        url: "/student/enroll-existing",
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
  useEnrollExistingStudentMutation,
  useGetAllStudentsQuery,
  useGetStudentByIdQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useGetMyProfileQuery,
} = studentApi;