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

  if (result?.error?.status === 401) {
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
  tagTypes: ["Student", "Payment", "Course", "Attendance", "Activity", "Dashboard"],
  // Refetch lists whenever the window regains focus (e.g. user navigates back
  // to the page from elsewhere) so the data is always fresh.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});