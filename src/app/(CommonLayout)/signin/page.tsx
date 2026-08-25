"use client";
import SignInPage from "@/components/modules/auth/SignInPage";
import { Suspense } from "react";

const SignIn = () => (
  <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-4 py-10">
    <Suspense
      fallback={
        <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  </div>
);

export default SignIn;