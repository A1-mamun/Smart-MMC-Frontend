"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAppDispatch } from "@/redux/hooks";
import { setUser } from "@/redux/features/auth/authSlice";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { verifyToken } from "@/utils/decodeToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  studentId: z
    .string()
    .min(1, "Student ID is required")
    .regex(
      /^(SMC-[A-Z0-9-]+|2[5-8][1-4]\d{3})$/i,
      'Use "SMC-..." format or your HSC student ID (e.g. 271200)',
    ),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const SignInPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirect = searchParams.get("redirectPath") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { studentId: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const res = await login(data).unwrap();
      if (res.success && res.data?.accessToken) {
        const { user } = verifyToken(res.data.accessToken);
        user.mustChangePassword = res.data.user?.mustChangePassword || false;
        dispatch(setUser({ user, token: res.data.accessToken }));

        toast.success("Logged in successfully");
        if (user.mustChangePassword) {
          const target = user.role === "STUDENT" ? "/dashboard/student/change-password" : "/dashboard/change-password";
          router.push(target);
        } else {
          const target = user.role === "STUDENT" ? "/dashboard/student" : redirect || "/dashboard";
          router.push(target);
        }
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your Smart MMC account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              placeholder="e.g. 271200 or SMC-ADMIN-001"
              {...register("studentId")}
              autoComplete="username"
            />
            {errors.studentId && (
              <p className="text-sm text-destructive">{errors.studentId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Forgot your password? Contact your administrator.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default SignInPage;