import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TSettingsConfig,
  TSettingsConfigPatch,
  TRunAbsentWarningResult,
  TRunExamAbsenceWarningResult,
} from "@/types/settings";

/**
 * Settings slice — three endpoints, all under /api/v1/settings:
 *   GET  /config                       → current configs (cached 60s)
 *   PUT  /config                       → super-admin-only update
 *   POST /absent-warning/run           → any admin can fire an ad-hoc run
 *   POST /exam-absence/run             → any admin can fire exam-absence run
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
    runAbsentWarningNow: build.mutation<
      TApiResponse<TRunAbsentWarningResult>,
      void
    >({
      query: () => ({ url: "/settings/absent-warning/run", method: "POST" }),
      // The ad-hoc run mutates state downstream (SmsLog + weekly
      // dedupe rows) but does NOT change the saved config. The
      // Activity and Sms tags are invalidated by SmsService itself
      // when sendSmsToDB writes its rows — we only need to refresh
      // Settings to keep the UI's idea of "last result" consistent.
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
  useRunAbsentWarningNowMutation,
  useRunExamAbsenceWarningNowMutation,
} = settingsApi;
