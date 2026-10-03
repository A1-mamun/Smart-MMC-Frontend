"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useFreeLoginMutation } from "@/redux/features/freeClass/freeClassApi";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { setUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { verifyToken } from "@/utils/decodeToken";

const phoneRegex = /^01[3-9]\d{8}$/;

const schema = z.object({
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(phoneRegex, "Use a valid BD mobile number, e.g. 01712345678"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const FreeClassLoginForm = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [freeLogin] = useFreeLoginMutation();
  const [authLogin] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mobile: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    // Try the dedicated /free-class/login first — it returns the right
    // "free account required" error if a paid student accidentally tries
    // to sign in here. Fall back to the regular /auth/sign-in so paid
    // students can also reach the free classes page (preview mode).
    const persist = (user: {
      id: string;
      studentId: string;
      name: string;
      role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
      mustChangePassword: boolean;
      isFreeAccount?: boolean;
    }, token: string) => {
      const decoded = verifyToken(token);
      const merged = {
        ...decoded.user,
        mustChangePassword: user.mustChangePassword,
        isFreeAccount: !!user.isFreeAccount,
      };
      dispatch(setUser({ user: merged, token }));
    };

    try {
      const res = await freeLogin(values).unwrap();
      if (res.success && res.data?.accessToken) {
        persist(res.data.user, res.data.accessToken);
        toast.success("Logged in to Free Classes");
        router.refresh();
        return;
      }
    } catch {
      // Free-account endpoint refused (e.g. paid account, or wrong
      // password). Fall through to /auth/sign-in for paid accounts.
    }

    try {
      const res = await authLogin({
        mobile: values.mobile,
        password: values.password,
      }).unwrap();
      if (res.success && res.data?.accessToken) {
        const user = res.data.user;
        persist(
          {
            ...user,
            isFreeAccount: !!user.isFreeAccount,
          },
          res.data.accessToken,
        );
        toast.success("Logged in");
        router.refresh();
      }
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Invalid credentials";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="free-login-mobile">Mobile Number</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="free-login-mobile"
            placeholder="01712345678"
            className="pl-9"
            autoComplete="username"
            {...register("mobile")}
          />
        </div>
        {errors.mobile && (
          <p className="text-sm text-destructive">{errors.mobile.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="free-login-password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="free-login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            className="pl-9 pr-10"
            autoComplete="current-password"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
};

export default FreeClassLoginForm;