import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";

type TUserListItem = {
  id: string;
  studentId: string;
  name: string;
  nickname?: string | null;
  mobile?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
};

type TCreateUserPayload = {
  // `studentId` is server-generated (SMC-ADMIN-NNN) — see
  // `auth.service.ts generateNextAdminStudentId`. The super admin only
  // supplies name, password, optional mobile, and a role.
  name: string;
  password: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  // Optional — admins can attach a BD mobile so they can also log in
  // via mobile + password (mirrors students). Backend persists as NULL
  // when omitted.
  mobile?: string;
};

type TUpdateUserPayload = {
  name?: string;
  password?: string;
  // Empty string → backend clears the column; valid BD mobile → sets
  // it; missing key → column untouched.
  mobile?: string | null;
};

const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllUsers: build.query<TApiResponse<TUserListItem[]>, any>({
      query: (params) => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
          }
        });
        return { url: `/user?${query.toString()}`, method: "GET" };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((u) => ({ type: "Dashboard" as const, id: u.id })),
              { type: "Dashboard" as const, id: "LIST" },
            ]
          : [{ type: "Dashboard" as const, id: "LIST" }],
    }),
    getUserById: build.query<TApiResponse<TUserListItem>, string>({
      query: (id) => ({ url: `/user/${id}`, method: "GET" }),
    }),
    createUser: build.mutation<TApiResponse<TUserListItem>, TCreateUserPayload>({
      query: (data) => ({
        url: "/user",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Dashboard", id: "LIST" }, "Activity"],
    }),
    updateUser: build.mutation<TApiResponse<TUserListItem>, { id: string; data: TUpdateUserPayload }>({
      query: ({ id, data }) => ({
        url: `/user/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Dashboard", id: "LIST" },
        { type: "Dashboard", id },
        "Activity",
      ],
    }),
    deleteUser: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/user/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _err, id) => [
        { type: "Dashboard", id: "LIST" },
        { type: "Dashboard", id },
        "Activity",
      ],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;