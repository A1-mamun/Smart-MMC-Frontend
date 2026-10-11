import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TSuccessStudent,
  TSuccessStudentCreateInput,
  TCloudinarySignResponse,
} from "@/types/successStudent";

/**
 * Success-student slice — four endpoints:
 *   - useGetSuccessStudentsQuery       (public) — landing page grid source
 *   - useSignSuccessStudentUploadMutation        — admin gets signed params
 *   - useCreateSuccessStudentMutation            — admin commits the row
 *   - useDeleteSuccessStudentMutation            — admin removes row + file
 *
 * The "SuccessStudent" tag drives cache invalidation: a create or
 * delete invalidates the tag, so the public list refetches (and the
 * admin list, which also reads via the same endpoint, updates).
 *
 * `getSuccessStudents` is the only query — it returns the public
 * list with no auth. The 60s server-side cache (successStudent.route.ts)
 * means the landing page loads are fast and the DB isn't hit per nav.
 */
const successStudentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSuccessStudents: build.query<
      TApiResponse<TSuccessStudent[]>,
      void
    >({
      query: () => ({ url: "/success-student", method: "GET" }),
      providesTags: ["SuccessStudent"],
    }),

    signSuccessStudentUpload: build.mutation<
      TApiResponse<TCloudinarySignResponse>,
      { folder?: string } | void
    >({
      query: (body) => ({
        url: "/success-student/sign",
        method: "POST",
        body: body || {},
      }),
    }),

    createSuccessStudent: build.mutation<
      TApiResponse<TSuccessStudent>,
      TSuccessStudentCreateInput
    >({
      query: (body) => ({
        url: "/success-student",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SuccessStudent"],
    }),

    deleteSuccessStudent: build.mutation<
      TApiResponse<TSuccessStudent>,
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/success-student/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SuccessStudent"],
    }),
  }),
});

export const {
  useGetSuccessStudentsQuery,
  useSignSuccessStudentUploadMutation,
  useCreateSuccessStudentMutation,
  useDeleteSuccessStudentMutation,
} = successStudentApi;
