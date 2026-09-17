import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TSmsBalance,
  TSmsLog,
  TSmsSendResult,
  TSendSmsPayload,
} from "@/types/sms";

const smsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendSms: build.mutation<TApiResponse<TSmsSendResult>, TSendSmsPayload>({
      query: (data) => ({ url: "/sms", method: "POST", body: data }),
      // Sending SMS isn't a list-affecting mutation — the Sms log list
      // refetches on its own via the invalidatesTags below.
      invalidatesTags: ["Activity", "Sms"],
    }),
    getSmsBalance: build.query<TApiResponse<TSmsBalance>, void>({
      query: () => ({ url: "/sms/balance", method: "GET" }),
      providesTags: ["Sms"],
    }),
    getMySmsLogs: build.query<
      TApiResponse<TSmsLog[]>,
      { limit?: number } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.limit) query.append("limit", String(params.limit));
        const qs = query.toString();
        return { url: `/sms/logs${qs ? `?${qs}` : ""}`, method: "GET" };
      },
      providesTags: ["Sms"],
    }),
  }),
});

export const {
  useSendSmsMutation,
  useGetSmsBalanceQuery,
  useGetMySmsLogsQuery,
} = smsApi;