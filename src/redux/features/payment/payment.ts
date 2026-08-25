import { baseApi } from "@/redux/api/baseApi";
import { TPaymentRecord, TDuePaymentsData, TStudentPaymentsData } from "@/types/payment";
import { TApiResponse } from "@/types/common";

const paymentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    recordPayment: build.mutation<TApiResponse<TPaymentRecord>, any>({
      query: (data) => ({ url: "/payment", method: "POST", body: data }),
      // Recording a payment changes the student's paid/due totals — invalidate
      // Student and Payment caches so the lists refresh everywhere.
      invalidatesTags: ["Payment", "Student", "Dashboard", "Activity"],
    }),
    getAllPayments: build.query<TApiResponse<TPaymentRecord[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/payment?${query.toString()}`, method: "GET" };
      },
      providesTags: ["Payment"],
    }),
    getDuePayments: build.query<TApiResponse<TDuePaymentsData>, void>({
      query: () => ({ url: "/payment/due", method: "GET" }),
      providesTags: ["Payment"],
    }),
    getStudentPayments: build.query<TApiResponse<TStudentPaymentsData>, string>({
      query: (studentId) => ({
        url: `/payment/student/${studentId}`,
        method: "GET",
      }),
      providesTags: (_result, _err, studentId) => [
        "Payment",
        { type: "Student", id: studentId },
      ],
    }),
    updatePayment: build.mutation<TApiResponse<TPaymentRecord>, { id: string; data: Partial<TPaymentRecord> }>({
      query: ({ id, data }) => ({
        url: `/payment/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Payment", "Student", "Dashboard", "Activity"],
    }),
    deletePayment: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/payment/${id}`, method: "DELETE" }),
      invalidatesTags: ["Payment", "Student", "Dashboard", "Activity"],
    }),
  }),
});

export const {
  useRecordPaymentMutation,
  useGetAllPaymentsQuery,
  useGetDuePaymentsQuery,
  useGetStudentPaymentsQuery,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
} = paymentApi;