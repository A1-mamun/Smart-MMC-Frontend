import {
  BaseQueryApi,
  BaseQueryFn,
  createApi,
  DefinitionType,
  FetchArgs,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";
import { RootState } from "../store";
import { logOut, setUser } from "../features/auth/authSlice";
import { logoutUser } from "@/services/auth";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_BASE_API as string,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithRefreshToken: BaseQueryFn<
  FetchArgs,
  BaseQueryApi,
  DefinitionType
> = async (args, api, extraOptions): Promise<any> => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 404) {
    toast.error((result?.error?.data as { message?: string })?.message);
  }

  // 401 handling — refresh-token dance. We deliberately ONLY attempt
  // a refresh for endpoints that use the accessToken bearer scheme.
  // `sign-in` returns 401 on wrong credentials, and `refresh-token`
  // returns 401 when the cookie is missing/invalid; running the
  // refresh path for either causes the side-effect cascade logged by
  // the user: the failing refresh dispatches `logOut()` and calls
  // `logoutUser()`, which deletes the refreshToken cookie while the
  // page is mid-navigation, producing a flurry of /signin redirects
  // and Next.js dev-mode "Cannot write to a CLOSED writable stream"
  // HMR errors as Fast Refresh tries to push updates to a torn-down
  // page.
  //
  // Endpoints that own their own 401 contract (auth + public routes)
  // short-circuit here.
  const url = typeof args === "string" ? args : args.url;
  const isAuthEndpoint =
    typeof url === "string" &&
    (url.includes("/auth/sign-in") ||
      url.includes("/auth/refresh-token") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      // Free-class endpoints own their own 401/409 contracts (the signup
      // form surfaces 409 duplicates and 400 validation errors verbatim,
      // and a failed free-login should NOT trigger a refresh-token
      // cascade that wipes the redux session).
      url.includes("/free-class/signup") ||
      url.includes("/free-class/login"));
  if (result?.error?.status === 401 && !isAuthEndpoint) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_API}/auth/refresh-token`,
        { method: "POST", credentials: "include" },
      );
      const data = await res.json();

      if (data?.data?.accessToken) {
        const user = (api.getState() as RootState).auth.user;
        api.dispatch(setUser({ user: user!, token: data.data.accessToken }));
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logOut());
        await logoutUser();
      }
    } catch {
      api.dispatch(logOut());
      await logoutUser();
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithRefreshToken,
  // Tags drive automatic cache invalidation. When a mutation invalidates one of
  // these tags, every query that provided the same tag will refetch.
  tagTypes: ["Student", "Payment", "Course", "CourseSeats", "Attendance", "Activity", "Dashboard", "Sms", "Exam", "ExamResult", "Settings", "FreeContent"],
  // Refetch lists whenever the window regains focus (e.g. user navigates back
  // to the page from elsewhere) so the data is always fresh.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});