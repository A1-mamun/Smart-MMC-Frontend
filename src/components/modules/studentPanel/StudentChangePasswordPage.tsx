"use client";
import ChangePasswordPage from "@/components/modules/auth/ChangePasswordPage";

const StudentChangePasswordPage = () => {
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Change Password</h2>
      <ChangePasswordPage redirectTo="/dashboard/student" />
    </div>
  );
};

export default StudentChangePasswordPage;