import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TSettingsConfig,
  TSettingsConfigPatch,
  TInstructorSection,
  TInstructorSectionPatch,
  TRunExamAbsenceWarningResult,
} from "@/types/settings";

/**
 * Settings slice — five endpoints, all under /api/v1/settings:
 *   GET  /public/instructor-section    → public landing-page stats
 *   PUT  /instructor-section           → super-admin-only update
 *   GET  /config                       → current configs (cached 60s)
 *   PUT  /config                       → super-admin-only update
 *   POST /exam-absence/run             → any admin can fire exam-absence run
 *
 * The absent-warning feature is always-on and no longer has any
 * user-tunable knobs, so there's no longer a "Run absent-warning job
 * now" button on the Settings page. (The backend endpoint is still
 * available at /api/v1/settings/absent-warning/run for an admin escape
 * hatch via curl / Postman.)
 *
 * Tagging:
 *   - "Settings"           → invalidates exam-absence config queries
 *   - "InstructorSection"  → invalidates the public landing-page
 *     read AND the admin form so a super-admin save immediately
 *     refetches both views
 */
const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<TApiResponse<TSettingsConfig>, void>({
      query: () => ({ url: "/settings/config", method: "GET" }),
      providesTags: ["Settings"],
    }),
    updateSettings: build.mutation<
      TApiResponse<TSettingsConfig>,
      TSettingsConfigPatch
    >({
      query: (body) => ({ url: "/settings/config", method: "PUT", body }),
      invalidatesTags: ["Settings"],
    }),
    runExamAbsenceWarningNow: build.mutation<
      TApiResponse<TRunExamAbsenceWarningResult>,
      void
    >({
      query: () => ({ url: "/settings/exam-absence/run", method: "POST" }),
      invalidatesTags: ["Settings"],
    }),
    getInstructorSection: build.query<
      TApiResponse<TInstructorSection>,
      void
    >({
      query: () => ({
        url: "/settings/public/instructor-section",
        method: "GET",
      }),
      providesTags: ["InstructorSection"],
    }),
    updateInstructorSection: build.mutation<
      TApiResponse<TInstructorSection>,
      TInstructorSectionPatch
    >({
      query: (body) => ({
        url: "/settings/instructor-section",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["InstructorSection"],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useRunExamAbsenceWarningNowMutation,
  useGetInstructorSectionQuery,
  useUpdateInstructorSectionMutation,
} = settingsApi;
