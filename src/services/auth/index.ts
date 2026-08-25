"use server";
import { cookies } from "next/headers";

export const logoutUser = async () => {
  const cookieStore = await cookies();
  cookieStore.delete({ name: "refreshToken", path: "/" });
};

export const changePasswordServer = async (payload: {
  currentPassword: string;
  newPassword: string;
}) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_API}/auth/change-password`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to change password");
  return data;
};