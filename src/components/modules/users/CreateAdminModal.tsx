"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Loader2, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateUserMutation } from "@/redux/features/user/user";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
// Same BD format the backend's user.validation.ts uses — admins who
// want to log in by phone need a real, well-formed BD mobile.
const mobileRegex = /^01[3-9]\d{8}$/;

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  // No `studentId` field — the backend mints the next SMC-ADMIN-NNN
  // slot at creation time so the super admin only has to supply the
  // person's name, an initial password, and a mobile.
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      passwordRegex,
      "Password must include uppercase, lowercase, and a number",
    ),
  // Required — admins sign in with mobile + password (mirrors students).
  // The backend enforces the same gate (see user.validation.ts), but we
  // mark it required here too so the form blocks submission client-side
  // and the user gets the message under the input immediately.
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(mobileRegex, "Use a valid BD mobile, e.g. 01712345678"),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

// const generatePassword = (length = 10) => {
//   const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
//   const out: string[] = [];
//   for (let i = 0; i < length; i++) {
//     out.push(chars[Math.floor(Math.random() * chars.length)]);
//   }
//   // Ensure policy: at least one upper, one lower, one digit.
//   return out.join("");
// };

const CreateAdminModal = ({ open, onClose, onSuccess }: Props) => {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [submitting, setSubmitting] = useState(false);
  // Server-minted identifier (e.g. "SMC-ADMIN-007") + the values the
  // super admin actually entered — surfaced together in the success
  // card so they can hand the credentials off in one shot.
  const [generated, setGenerated] = useState<{
    studentId: string;
    password: string;
    mobile: string | null;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      password: "",
      mobile: "",
    },
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const result = await createUser({
        name: data.name,
        password: data.password,
        // The schema's `.or(z.literal("").transform(...))` normalises
        // an empty input to `undefined` so the backend stores NULL
        // rather than an empty string.
        mobile: data.mobile || undefined,
        role: "ADMIN",
      }).unwrap();
      // Use the server-assigned `studentId` from the response — never
      // invent one on the client.
      const serverStudentId = (result as { data?: { studentId?: string } })
        ?.data?.studentId;
      if (!serverStudentId) {
        throw new Error("Server did not return a user ID");
      }
      setGenerated({
        studentId: serverStudentId,
        password: data.password,
        mobile: data.mobile || null,
      });
      toast.success("Admin created");
      onSuccess?.();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to create admin",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setGenerated(null);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="h-4 w-4" />
            Create Admin
          </DialogTitle>
        </DialogHeader>

        {generated ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Admin created. Share these credentials securely — they
                won&apos;t be shown again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-card p-3 col-span-2">
                <Label className="text-xs text-muted-foreground">
                  User ID (auto-generated)
                </Label>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono text-lg font-semibold">
                    {generated.studentId}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copy(generated.studentId, "User ID")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <Label className="text-xs text-muted-foreground">
                  Password
                </Label>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono text-sm font-semibold">
                    {generated.password}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copy(generated.password, "Password")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <Label className="text-xs text-muted-foreground">
                  Mobile (login handle)
                </Label>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono text-sm font-semibold">
                    {generated.mobile || (
                      <span className="text-muted-foreground font-sans italic">
                        none
                      </span>
                    )}
                  </p>
                  {generated.mobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copy(generated.mobile!, "Mobile")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Full Name *</Label>
              <Input
                id="adminName"
                placeholder="e.g. Tahmid Rahman"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminMobile">
                Mobile <span className="">*</span>{" "}
                <span className="text-xs text-muted-foreground">
                  (used as the admin's sign-in handle)
                </span>
              </Label>
              <Input
                id="adminMobile"
                type="tel"
                placeholder="e.g. 01712345678"
                {...register("mobile")}
              />
              {errors.mobile && (
                <p className="text-sm text-destructive">
                  {errors.mobile.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="adminPassword">Initial Password *</Label>
                {/* <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setValue("password", generatePassword(10), {
                      shouldValidate: true,
                    })
                  }
                >
                  Generate
                </Button> */}
              </div>
              <Input
                id="adminPassword"
                type="text"
                placeholder="Min 6 chars, must include upper, lower, and a number"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || isLoading}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Admin
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateAdminModal;
