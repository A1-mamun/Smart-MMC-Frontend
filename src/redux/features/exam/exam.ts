import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse, TPaginationMeta } from "@/types/common";
import {
  TExamListItem,
  TExamDetail,
  TExam,
  TMyResult,
  TMyUpcomingExam,
} from "@/types/exam";

type SectionInput = {
  id?: string;
  type: "MCQ" | "WRITTEN";
  name: string;
  totalQuestions: number;
  marksPerQuestion: number;
  position?: number;
};

type CreateExamInput = {
  title: string;
  syllabus: string;
  examDate: string;
  courseId: string;
  sections: SectionInput[];
};

type UpdateExamInput = Partial<CreateExamInput>;

const buildQuery = (params?: Record<string, unknown>) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
    });
  }
  return { url: `/exam${q.toString() ? `?${q.toString()}` : ""}`, method: "GET" as const };
};

// Cache-invalidation strategy for the `Exam` tag family:
// - List queries provide `{ type: "Exam", id: "LIST" }`.
// - Detail queries provide `{ type: "Exam", id: <uuid> }`.
// - Mutations invalidate the LIST tag (so the Exams page refetches after
//   any create/edit/publish/roster change) and the specific id (so the
//   detail page refetches). RTK Query matches by exact tag object, so we
//   MUST use the LIST sentinel — invalidating the bare string `"Exam"`
//   does not invalidate the list query anymore.
const EXAM_LIST_TAG = { type: "Exam" as const, id: "LIST" };

const examApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllExams: build.query<TApiResponse<TExamListItem[]>, Record<string, unknown> | void>({
      query: (params) => buildQuery(params as Record<string, unknown>),
      providesTags: (result) =>
        result
          ? [
              ...(result.data?.map((e) => ({ type: "Exam" as const, id: e.id })) ?? []),
              EXAM_LIST_TAG,
            ]
          : [EXAM_LIST_TAG],
    }),
    getExamById: build.query<TApiResponse<TExamDetail>, string>({
      query: (id) => ({ url: `/exam/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Exam", id }, "ExamResult"],
    }),
    createExam: build.mutation<TApiResponse<TExam>, CreateExamInput>({
      query: (data) => ({ url: "/exam", method: "POST", body: data }),
      // Belt-and-suspenders invalidation:
      // 1. The static `invalidatesTags` runs after the mutation succeeds
      //    and marks the LIST tag stale, so any subscribed `getAllExams`
      //    automatically refetches.
      // 2. `onQueryStarted` dispatches an *additional* explicit invalidate
      //    action immediately after the response arrives. We observed a
      //    race where the list rendered empty until a manual page reload —
      //    most likely caused by the modal's `onSaved` running before
      //    the auto-invalidation had propagated through the store. The
      //    explicit dispatch makes the invalidation synchronous from the
      //    caller's perspective and bypasses that race.
      invalidatesTags: [EXAM_LIST_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            examApi.util.invalidateTags([
              { type: "Exam", id: "LIST" },
            ]),
          );
        } catch {
          // The mutation itself surfaces errors to the caller via
          // `unwrap()`. We deliberately swallow errors here so we don't
          // double-toast.
        }
      },
    }),
    updateExam: build.mutation<
      TApiResponse<TExam>,
      { id: string; data: UpdateExamInput }
    >({
      query: ({ id, data }) => ({ url: `/exam/${id}`, method: "PATCH", body: data }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    setExamPublish: build.mutation<
      TApiResponse<TExam>,
      { id: string; isResultPublished: boolean }
    >({
      query: ({ id, isResultPublished }) => ({
        url: `/exam/${id}/publish`,
        method: "PATCH",
        body: { isResultPublished },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    upsertRoster: build.mutation<
      TApiResponse<{ added: number; removed: number }>,
      { id: string; add?: string[]; remove?: string[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/exam/${id}/roster`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    setAttendance: build.mutation<
      TApiResponse<unknown>,
      { id: string; studentId: string; isAbsent: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/exam/${id}/attendance`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    bulkAttendanceByStudentId: build.mutation<
      TApiResponse<{ marked: string[]; unknown: string[]; skipped: string[] }>,
      { id: string; studentIds: string[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/exam/${id}/attendance/bulk`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    upsertResult: build.mutation<
      TApiResponse<unknown>,
      {
        id: string;
        studentId: string;
        isAbsent?: boolean;
        remarks?: string;
        sections: {
          sectionId: string;
          correctAnswers?: number;
          obtainedMarks: number;
          notes?: string;
        }[];
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/exam/${id}/results`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    bulkResults: build.mutation<
      TApiResponse<{
        succeeded: { studentId: string; total: number }[];
        failed: { studentId: string; error: string }[];
      }>,
      {
        id: string;
        results: {
          studentId: string;
          isAbsent?: boolean;
          remarks?: string;
          sections: {
            sectionId: string;
            correctAnswers?: number;
            obtainedMarks: number;
            notes?: string;
          }[];
        }[];
      }
    >({
      query: ({ id, results }) => ({
        url: `/exam/${id}/results/bulk`,
        method: "PUT",
        body: { results },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Exam", id },
        EXAM_LIST_TAG,
        "ExamResult",
      ],
    }),
    getMyResults: build.query<
      TApiResponse<TMyResult[]> & { meta?: TPaginationMeta },
      Record<string, unknown> | void
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
          });
        }
        const qs = q.toString();
        return {
          url: `/exam/me/results${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["ExamResult"],
    }),
    /*
     * Upcoming exams for the signed-in student — every exam whose
     * `examDate >= today` across the student's active enrollments,
     * regardless of publish state. Drives the "Upcoming" tab on the
     * student panel and is intentionally separate from `getMyResults`
     * (which is past + published).
     */
    getMyUpcomingExams: build.query<
      TApiResponse<TMyUpcomingExam[]> & { meta?: TPaginationMeta },
      Record<string, unknown> | void
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
          });
        }
        const qs = q.toString();
        return {
          url: `/exam/me/upcoming${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["ExamResult"],
    }),
  }),
});

export const {
  useGetAllExamsQuery,
  useGetExamByIdQuery,
  useLazyGetExamByIdQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useSetExamPublishMutation,
  useUpsertRosterMutation,
  useSetAttendanceMutation,
  useBulkAttendanceByStudentIdMutation,
  useUpsertResultMutation,
  useBulkResultsMutation,
  useGetMyResultsQuery,
  useGetMyUpcomingExamsQuery,
} = examApi;