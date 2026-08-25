import { baseApi } from "@/redux/api/baseApi";
import {
  TAdmissionComparison,
  TBatchCourseStat,
  TCollectionTrendPoint,
  TPaymentMethodBreakdown,
} from "@/types/stats";
import { TApiResponse } from "@/types/common";

const statsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdmissionComparison: build.query<TApiResponse<TAdmissionComparison>, void>({
      query: () => ({ url: "/stats/admission-comparison", method: "GET" }),
    }),
    getBatchCourseStats: build.query<TApiResponse<TBatchCourseStat[]>, void>({
      query: () => ({ url: "/stats/batch-course", method: "GET" }),
    }),
    getCollectionTrend: build.query<TApiResponse<TCollectionTrendPoint[]>, void>({
      query: () => ({ url: "/stats/collection-trend", method: "GET" }),
    }),
    getPaymentMethodBreakdown: build.query<TApiResponse<TPaymentMethodBreakdown[]>, void>({
      query: () => ({ url: "/stats/payment-method", method: "GET" }),
    }),
  }),
});

export const {
  useGetAdmissionComparisonQuery,
  useGetBatchCourseStatsQuery,
  useGetCollectionTrendQuery,
  useGetPaymentMethodBreakdownQuery,
} = statsApi;