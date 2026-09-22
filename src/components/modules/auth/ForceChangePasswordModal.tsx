"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useChangePasswordMutation } from "@/redux/features/auth/authApi";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logOut, useCurrentUser } from "@/redux/features/auth/authSlice";
import { logoutUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Forced first-login / temporary-password change. Rendered at the
 * dashboard layout level whenever the signed-in user has
 * `mustChangePassword === true` — the dialog is locked (no close button,
 * no escape, no outside-click dismissal) so the user cannot navigate
 * away or interact with the rest of the app until they set a new
 * password. The admin / student change-password pages still exist for
 * voluntary use; this component is the blocking modal version.
 *
 * On success, the redux user is patched (`mustChangePassword: false`)
 * so the layout guard re-evaluates and the modal unmounts.
 */
const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Must contain upper, lower, and a digit"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof schema>;

const ForceChangePasswordModal = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(useCurrentUser);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const open = !!user?.mustChangePassword;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // If the redux user is missing while the modal would otherwise show
  // (e.g. session expired mid-render), bounce back to the sign-in page.
  useEffect(() => {
    if (open && !user) {
      router.replace("/signin");
    }
  }, [open, user, router]);

  const onSubmit = async (data: FormData) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).unwrap();

      /*
       * First-login / temporary-password flow: once the new password is
       * saved we deliberately SIGN OUT and bounce the user back to the
       * sign-in page so they authenticate with their fresh credentials.
       * This matches the request: "after update password for first time
       * login it should redirect to login again with the new credential".
       *
       * Steps:
       *  1. Reset the form so any in-flight typed input doesn't bleed
       *     into the next mount.
       *  2. Clear redux auth state via `logOut()` (drops user + token).
       *  3. Delete the refresh-token cookie via the server action so
       *     the next /signin render doesn't see a stale session.
       *  4. Toast and route to /signin.
       */
      reset();

      dispatch(logOut());
      await logoutUser();

      toast.success(
        "Password updated. Please sign in again with your new password.",
      );
      router.replace("/signin");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to change password");
    }
  };

  return (
    <Dialog open={open} modal>
      {/*
        `modal` + no `onOpenChange` handler + hiding the built-in close
        button (see DialogContent usage below) means the user CANNOT
        dismiss this dialog by clicking the overlay, pressing Escape,
        or clicking the X. They have to submit a valid new password.
      */}
      <DialogContent
        className="sm:max-w-md"
        // Radix renders a built-in close button inside DialogContent —
        // strip it by hiding [data-radix-dialog-close] descendants.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Set a new password</DialogTitle>
          <DialogDescription className="text-center">
            You signed in with a temporary password. Choose a new password to
            continue — you won&apos;t be able to use the app until you do.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fcp-current">Current password</Label>
            <Input
              id="fcp-current"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fcp-new">New password</Label>
            <Input
              id="fcp-new"
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              At least 6 characters, with upper &amp; lower case letters and a digit.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fcp-confirm">Confirm new password</Label>
            <Input
              id="fcp-confirm"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Update password &amp; continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForceChangePasswordModal;
