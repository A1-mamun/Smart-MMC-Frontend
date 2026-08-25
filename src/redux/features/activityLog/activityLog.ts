import { baseApi } from "@/redux/api/baseApi";
import { TActivityLog } from "@/types/activityLog";
import { TApiResponse } from "@/types/common";

const activityLogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRecentActivities: build.query<TApiResponse<TActivityLog[]>, number | void>({
      query: (limit) => ({
        url: `/activity-log/recent?limit=${limit || 10}`,
        method: "GET",
      }),
    }),
    getAllActivities: build.query<TApiResponse<TActivityLog[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/activity-log?${query.toString()}`, method: "GET" };
      },
    }),
  }),
});

export const { useGetRecentActivitiesQuery, useGetAllActivitiesQuery } =
  activityLogApi;