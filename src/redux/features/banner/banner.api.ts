import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TBanner,
  TBannerCreateInput,
  TCloudinarySignResponse,
} from "@/types/banner";

/**
 * Banner slice — four endpoints:
 *   - useGetBannersQuery       (public)  — landing page hero source
 *   - useSignBannerUploadMutation         — admin gets signed params
 *   - useCreateBannerMutation             — admin commits the row
 *   - useDeleteBannerMutation             — admin removes row + file
 *
 * The "Banner" tag drives cache invalidation: a create or delete
 * invalidates the tag, so the public list refetches (and the admin
 * list, which also reads via the same endpoint, updates).
 *
 * `getBanners` is the only query — it returns the public list with
 * no auth. The 60s server-side cache (banner.route.ts) means the
 * landing page loads are fast and the DB isn't hit per nav.
 */
const bannerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBanners: build.query<TApiResponse<TBanner[]>, void>({
      query: () => ({ url: "/banner", method: "GET" }),
      providesTags: ["Banner"],
    }),

    signBannerUpload: build.mutation<
      TApiResponse<TCloudinarySignResponse>,
      { folder?: string } | void
    >({
      query: (body) => ({
        url: "/banner/sign",
        method: "POST",
        body: body || {},
      }),
    }),

    createBanner: build.mutation<
      TApiResponse<TBanner>,
      TBannerCreateInput
    >({
      query: (body) => ({ url: "/banner", method: "POST", body }),
      invalidatesTags: ["Banner"],
    }),

    deleteBanner: build.mutation<TApiResponse<TBanner>, { id: string }>({
      query: ({ id }) => ({ url: `/banner/${id}`, method: "DELETE" }),
      invalidatesTags: ["Banner"],
    }),
  }),
});

export const {
  useGetBannersQuery,
  useSignBannerUploadMutation,
  useCreateBannerMutation,
  useDeleteBannerMutation,
} = bannerApi;
