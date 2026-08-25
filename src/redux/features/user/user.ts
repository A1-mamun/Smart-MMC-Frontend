import { baseApi } from "@/redux/api/baseApi";
import { TApiResponse } from "@/types/common";

type TUserListItem = {
  id: string;
  studentId: string;
  name: string;
  nickname?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
};

type TCreateUserPayload = {
  studentId: string;
  name: string;
  password: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
};

type TUpdateUserPayload = {
  name?: string;
  studentId?: string;
  password?: string;
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
    }),
    updateUser: build.mutation<TApiResponse<TUserListItem>, { id: string; data: TUpdateUserPayload }>({
      query: ({ id, data }) => ({
        url: `/user/${id}`,
        method: "PATCH",
        body: data,
      }),
    }),
    deleteUser: build.mutation<TApiResponse<null>, string>({
      query: (id) => ({ url: `/user/${id}`, method: "DELETE" }),
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