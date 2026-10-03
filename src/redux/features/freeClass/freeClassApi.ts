import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TFreeAdminChapter,
  TFreeAdminChapterInput,
  TFreeAdminChapterOption,
  TFreeAdminCreatePayload,
  TFreeAdminCreateResponse,
  TFreeAdminSubject,
  TFreeAdminSubjectInput,
  TFreeAdminTopic,
  TFreeAdminTopicInput,
  TFreeAuthResponse,
  TFreeContentTree,
  TFreeLoginPayload,
  TFreePlayback,
  TFreeSignupPayload,
} from "@/types/freeClass";

const freeClassApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ── Public / student-facing ──────────────────────────────────────────
    freeSignup: build.mutation<
      TApiResponse<TFreeAuthResponse>,
      TFreeSignupPayload
    >({
      query: (data) => ({
        url: "/free-class/signup",
        method: "POST",
        body: data,
      }),
    }),
    freeLogin: build.mutation<
      TApiResponse<TFreeAuthResponse>,
      TFreeLoginPayload
    >({
      query: (data) => ({
        url: "/free-class/login",
        method: "POST",
        body: data,
      }),
    }),
    getFreeContent: build.query<TApiResponse<TFreeContentTree>, void>({
      query: () => ({ url: "/free-class/content", method: "GET" }),
      providesTags: ["FreeContent"],
    }),
    getTopicPlayback: build.query<TApiResponse<TFreePlayback>, string>({
      query: (topicId) => ({
        url: `/free-class/content/${topicId}/play`,
        method: "GET",
      }),
    }),

    // ── Admin CRUD ────────────────────────────────────────────────────────
    // All admin endpoints live under /free-class/admin/* and require
    // SUPER_ADMIN or ADMIN role (enforced by the backend middleware).
    getAdminSubjects: build.query<TApiResponse<TFreeAdminSubject[]>, void>({
      query: () => ({ url: "/free-class/admin/subjects", method: "GET" }),
      providesTags: ["FreeContent"],
    }),
    createSubject: build.mutation<
      TApiResponse<TFreeAdminSubject>,
      TFreeAdminSubjectInput
    >({
      query: (data) => ({
        url: "/free-class/admin/subjects",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),
    updateSubject: build.mutation<
      TApiResponse<TFreeAdminSubject>,
      { id: string; data: Partial<TFreeAdminSubjectInput> }
    >({
      query: ({ id, data }) => ({
        url: `/free-class/admin/subjects/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),
    deleteSubject: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({
        url: `/free-class/admin/subjects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FreeContent"],
    }),

    createChapter: build.mutation<
      TApiResponse<TFreeAdminSubject["chapters"][number]>,
      { subjectId: string; data: TFreeAdminChapterInput }
    >({
      query: ({ subjectId, data }) => ({
        url: `/free-class/admin/subjects/${subjectId}/chapters`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),
    updateChapter: build.mutation<
      TApiResponse<TFreeAdminSubject["chapters"][number]>,
      { id: string; data: Partial<TFreeAdminChapterInput> }
    >({
      query: ({ id, data }) => ({
        url: `/free-class/admin/chapters/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),
    deleteChapter: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({
        url: `/free-class/admin/chapters/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FreeContent"],
    }),

    createTopic: build.mutation<
      TApiResponse<TFreeAdminChapter["topics"][number]>,
      { chapterId: string; data: TFreeAdminTopicInput }
    >({
      query: ({ chapterId, data }) => ({
        url: `/free-class/admin/chapters/${chapterId}/topics`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),
    updateTopic: build.mutation<
      TApiResponse<TFreeAdminChapter["topics"][number]>,
      { id: string; data: Partial<TFreeAdminTopicInput> }
    >({
      query: ({ id, data }) => ({
        url: `/free-class/admin/topics/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),
    deleteTopic: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({
        url: `/free-class/admin/topics/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FreeContent"],
    }),

    previewTopic: build.query<TApiResponse<TFreePlayback>, string>({
      query: (id) => ({
        url: `/free-class/admin/topics/${id}/play`,
        method: "POST",
      }),
    }),

    /**
     * Single-step create: subject (Math 1st/2nd Paper) + topic title +
     * YouTube URL. Server upserts subject + chapter and returns the
     * whole branch so the UI can refresh its cache directly.
     */
    createFreeClass: build.mutation<
      TApiResponse<TFreeAdminCreateResponse>,
      TFreeAdminCreatePayload
    >({
      query: (data) => ({
        url: "/free-class/admin/topics/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FreeContent"],
    }),

    /**
     * Chapter picker query for the create-class modal. Pass
     * `subjectId` to scope the list to a single subject; omit it to
     * get every chapter grouped by subject position.
     */
    listAdminChapters: build.query<
      TApiResponse<TFreeAdminChapterOption[]>,
      { subjectId?: string } | void
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.subjectId) params.append("subjectId", arg.subjectId);
        const qs = params.toString();
        return {
          url: `/free-class/admin/chapters${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["FreeContent"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFreeSignupMutation,
  useFreeLoginMutation,
  useGetFreeContentQuery,
  useLazyGetTopicPlaybackQuery,
  useGetAdminSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useCreateChapterMutation,
  useUpdateChapterMutation,
  useDeleteChapterMutation,
  useCreateTopicMutation,
  useUpdateTopicMutation,
  useDeleteTopicMutation,
  useLazyPreviewTopicQuery,
  useCreateFreeClassMutation,
  useListAdminChaptersQuery,
} = freeClassApi;