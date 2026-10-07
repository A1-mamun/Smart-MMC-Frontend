"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";
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

/**
 * Signin-only form. The card chrome lives in
 * `app/(CommonLayout)/free-classes/signin/page.tsx`.
 *
 * The form is intentionally stateless across navigations: no
 * `?mobile=` query-param pre-fill, no sessionStorage draft. The
 * user types their own number every time.
 *
 * If the account doesn't exist (404 NOT_FOUND from the free
 * login endpoint or the regular /auth/sign-in), the form
 * pushes the user straight to `/free-classes/signup` — the
 * "Sign in" button doubles as the entry point to the signup
 * flow.
 */
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

  // The freeLogin endpoint returns 404 NOT_FOUND with message
  // "No account found with this mobile number" when the mobile
  // isn't registered. We treat that as the "first sign up" signal —
  // any other 4xx (wrong password, banned, etc.) gets the regular
  // toast.
  const isAccountMissing = (msg: string | undefined) => {
    if (!msg) return false;
    const m = msg.toLowerCase();
    return (
      m.includes("no account found") ||
      m.includes("not found") ||
      m.includes("doesn't exist") ||
      m.includes("does not exist")
    );
  };

  const onSubmit = async (values: FormValues) => {
    // Try the dedicated /free-class/login first — it returns the right
    // "free account required" error if a paid student accidentally tries
    // to sign in here. Fall back to the regular /auth/sign-in so paid
    // students can sign in via the regular portal and land on their
    // own dashboard.
    const persist = (user: {
      id: string;
      // Mobile replaces the dropped `User.studentId` as the
      // per-account identifier on the auth payload.
      mobile: string;
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
        // Refresh the route group so the now-authenticated
        // FreeClassLanding server component re-renders with the
        // content view, then push to /free-classes (the free
        // student's content home). The server already confirmed
        // `isFreeAccount: true` via this endpoint so we don't
        // need to re-check.
        router.refresh();
        router.push("/free-classes");
        return;
      }
    } catch (err) {
      const e = err as { status?: number; data?: { message?: string } };
      const message = e?.data?.message;
      // 404 from /free-class/login means the mobile isn't registered
      // as a free account. Push the user straight to the signup
      // page so they can create an account — the "Sign in" button
      // doubles as the entry point to the signup flow.
      if (e?.status === 404 || isAccountMissing(message)) {
        router.push("/free-classes/signup");
        return;
      }
      // Free-account endpoint refused (paid account, wrong
      // password, banned, …). Fall through to /auth/sign-in so
      // paid students can sign in via the regular portal.
    }

    try {
      const res = await authLogin({
        mobile: values.mobile,
        password: values.password,
      }).unwrap();
      if (res.success && res.data?.accessToken) {
        const user = res.data.user;
        // Trust the server's payload over the JWT decode so a token
        // minted before isFreeAccount was added still reflects the
        // current DB state — same pattern as SignInPage.
        const isFreeAccount = !!user.isFreeAccount;
        const mustChangePassword = !!user.mustChangePassword;
        persist(
          {
            ...user,
            isFreeAccount,
          },
          res.data.accessToken,
        );
        toast.success("Logged in");
        router.refresh();
        // Routing per case-2 in the spec:
        //   - free student → free-class content home
        //   - paid student → student panel
        //   - admin → admin dashboard
        // mustChangePassword takes priority so the user is forced
        // to rotate their password before they reach their home.
        if (mustChangePassword) {
          const target =
            user.role === "STUDENT"
              ? "/dashboard/student/change-password"
              : "/dashboard/change-password";
          router.push(target);
        } else if (isFreeAccount) {
          router.push("/free-classes");
        } else if (user.role === "STUDENT") {
          router.push("/dashboard/student");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      const e = err as { status?: number; data?: { message?: string } };
      const message = e?.data?.message;
      if (e?.status === 404 || isAccountMissing(message)) {
        router.push("/free-classes/signup");
        return;
      }
      toast.error(message || "Invalid credentials");
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
      <p className="text-center text-xs text-muted-foreground">
        New here?{" "}
        <a
          href="/free-classes/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up here
        </a>
        .
      </p>
    </form>
  );
};

export default FreeClassLoginForm;