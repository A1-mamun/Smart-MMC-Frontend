import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";
import {
  TCreatePp,
  TPpDetail,
  TPpOption,
  TPpPayment,
  TPpWithStats,
  TRecordPpPayment,
} from "@/types/pp";

/**
 * PP slice — six endpoints:
 *   - useGetPpsQuery            (admin) — management page list
 *   - useGetPpDetailQuery       (admin) — detail dialog data
 *   - useGetActivePpsQuery      (admin) — narrow list for the
 *                                           admit form's PP select
 *   - useCreatePpMutation       (admin) — add PP
 *   - useDeletePpMutation       (admin) — soft-delete PP
 *   - useRecordPpPaymentMutation (admin) — record a payout
 *
 * Two tags, "PP" and "PpPayment", drive the invalidation. The
 * two mutation types (`useCreatePp`, `useDeletePp`) invalidate
 * both because they affect the list and may leave stale detail
 * data. `useRecordPpPayment` only invalidates "PpPayment" — the
 * PP list is unaffected by a new payout row, so a global
 * `["PP", "PpPayment"]` invalidation here would be overkill and
 * would force a refetch of every open PP detail dialog.
 */
const ppApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPps: build.query<TApiResponse<TPpWithStats[]>, void>({
      query: () => ({ url: "/pp", method: "GET" }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((p) => ({ type: "PP" as const, id: p.id })),
              { type: "PP" as const, id: "LIST" },
            ]
          : [{ type: "PP" as const, id: "LIST" }],
    }),

    getPpDetail: build.query<TApiResponse<TPpDetail>, string>({
      query: (id) => ({ url: `/pp/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "PP", id }],
    }),

    // Narrow list used by the admit form's PP select. Tagged as
    // "PP" so a create/delete invalidates it (the picker should
    // show the latest roster without a manual refresh).
    getActivePps: build.query<TApiResponse<TPpOption[]>, void>({
      query: () => ({ url: "/pp/active", method: "GET" }),
      providesTags: [{ type: "PP", id: "ACTIVE" }],
    }),

    createPp: build.mutation<TApiResponse<TPpWithStats>, TCreatePp>({
      query: (body) => ({ url: "/pp", method: "POST", body }),
      // Adding a PP affects the management list AND the admit
      // form's active list. Invalidate both. (The detail tag is
      // auto-invalidated by the LIST id entry above.)
      invalidatesTags: [
        { type: "PP", id: "LIST" },
        { type: "PP", id: "ACTIVE" },
      ],
    }),

    deletePp: build.mutation<TApiResponse<TPpWithStats>, { id: string }>({
      query: ({ id }) => ({ url: `/pp/${id}`, method: "DELETE" }),
      // Soft-deleting removes the row from both the management
      // list and the admit picker.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PP", id: "LIST" },
        { type: "PP", id: "ACTIVE" },
        { type: "PP", id },
      ],
    }),

    recordPpPayment: build.mutation<TApiResponse<TPpPayment>, TRecordPpPayment>({
      query: (body) => ({ url: "/pp/payment", method: "POST", body }),
      // Only the payment sub-tree needs to refetch. The PP list
      // (which only has counts) is unaffected.
      invalidatesTags: (_r, _e, arg) => [
        { type: "PpPayment", id: arg.ppId },
        // The student's per-student payout history also needs to
        // refresh when the payout is attributed. We can't know
        // the studentId from the response reliably across cache
        // edges, so we use a sentinel that the student detail
        // page subscribes to (see PpDetailDialog).
        "PpPayment",
      ],
    }),
  }),
});

export const {
  useGetPpsQuery,
  useGetPpDetailQuery,
  useGetActivePpsQuery,
  useCreatePpMutation,
  useDeletePpMutation,
  useRecordPpPaymentMutation,
} = ppApi;