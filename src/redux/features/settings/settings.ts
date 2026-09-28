import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TSettingsConfig,
  TSettingsConfigPatch,
  TRunExamAbsenceWarningResult,
} from "@/types/settings";

/**
 * Settings slice — three endpoints, all under /api/v1/settings:
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
 * The "Settings" tag is the only invalidation source: when a config is
 * patched, every dependent query (the settings page itself, the cron
 * status banner) refetches.
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
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useRunExamAbsenceWarningNowMutation,
} = settingsApi;
