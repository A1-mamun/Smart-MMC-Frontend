"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useFreeSignupMutation } from "@/redux/features/freeClass/freeClassApi";
import { setUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { verifyToken } from "@/utils/decodeToken";

import { hscBatches } from "@/constants/batches";
import type { TFreeIntakeMode } from "@/types/freeClass";

const phoneRegex = /^01[3-9]\d{8}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    mobile: z
      .string()
      .min(1, "Mobile number is required")
      .regex(phoneRegex, "Use a valid BD mobile number, e.g. 01712345678"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(
        passwordRegex,
        "Password must contain uppercase, lowercase and a number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    hscBatch: z.enum(["BATCH_25", "BATCH_26", "BATCH_27", "BATCH_28"], {
      message: "HSC batch is required",
    }),
    college: z.string().max(200).optional().or(z.literal("")),
    intakeMode: z.enum(["ONLINE", "OFFLINE"]),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

const FreeClassSignupForm = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [freeSignup, { isLoading }] = useFreeSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      hscBatch: "BATCH_27",
      college: "",
      intakeMode: "ONLINE",
    },
  });

  const intakeMode = watch("intakeMode");

  // Strip confirmPassword before sending to the backend — the server only
  // needs the password itself; the confirmation is a UX-only check.
  const onSubmit = async (values: FormValues) => {
    const { confirmPassword: _confirm, ...payload } = values;
    try {
      const res = await freeSignup(payload).unwrap();
      if (res.success && res.data?.accessToken) {
        // Trust the server payload + JWT decode — mirrors SignInPage.tsx.
        const { user } = verifyToken(res.data.accessToken);
        user.mustChangePassword = !!res.data.user?.mustChangePassword;
        user.isFreeAccount = !!res.data.user?.isFreeAccount;
        dispatch(setUser({ user, token: res.data.accessToken }));

        toast.success("Welcome to Smart MMC Free Classes!");
        // Stay on /free-classes — the FreeClassLanding component re-renders
        // with the now-logged-in user and switches to the content view.
        router.refresh();
      }
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      console.log("Free-class signup failed:", typed.data || err);
      const message =
        typed?.data?.message || "Signup failed. Please try again.";
      toast.error(message);
    }
  };

  return (
    <Card className="w-full max-w-2xl border-2 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Try our free HSC classes</CardTitle>
        <CardDescription>
          Sign up for free access to chapter-by-chapter video classes. Your
          mobile number is your login ID.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="free-name">Full Name *</Label>
              <Input
                id="free-name"
                placeholder="e.g. Anika Tabassum"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="free-mobile">Mobile Number *</Label>
              <Input
                id="free-mobile"
                placeholder="01712345678"
                {...register("mobile")}
                autoComplete="username"
              />
              {errors.mobile && (
                <p className="text-sm text-destructive">
                  {errors.mobile.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="free-batch">HSC Batch *</Label>
              <Select
                value={watch("hscBatch")}
                onValueChange={(v) =>
                  setValue("hscBatch", v as FormValues["hscBatch"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="free-batch">
                  <SelectValue placeholder="Select HSC batch" />
                </SelectTrigger>
                <SelectContent>
                  {hscBatches.map((batch) => (
                    <SelectItem key={batch.value} value={batch.value}>
                      {batch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.hscBatch && (
                <p className="text-sm text-destructive">
                  {errors.hscBatch.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="free-password">Password *</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="free-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="free-confirm-password">Confirm Password *</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="free-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-type your password"
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={
                    showConfirm
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="free-college">College Name (optional)</Label>
              <Input
                id="free-college"
                placeholder="e.g. Rajshahi College"
                {...register("college")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>How did you hear about us?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["ONLINE", "OFFLINE"] as TFreeIntakeMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() =>
                    setValue("intakeMode", mode, { shouldValidate: true })
                  }
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition",
                    intakeMode === mode
                      ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                      : "hover:border-primary/40",
                  )}
                >
                  <span className="font-semibold">
                    {mode === "ONLINE"
                      ? "Online / Social Media"
                      : "Offline / Walk-in"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {mode === "ONLINE"
                      ? "Facebook, YouTube, friend referral, etc."
                      : "Heard at coaching fair, friend’s batch, etc."}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <GraduationCap className="h-4 w-4" />
            <span>Start watching free classes</span>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already signed up?{" "}
            <Link
              href="/signin"
              className="font-medium text-primary hover:underline"
            >
              Sign in here
            </Link>
            .
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default FreeClassSignupForm;
