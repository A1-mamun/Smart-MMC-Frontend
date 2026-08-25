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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateUserMutation } from "@/redux/features/user/user";

const studentIdRegex = /^SMC-[A-Z0-9-]+$/i;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  studentId: z
    .string()
    .min(1, "User ID is required")
    .regex(studentIdRegex, 'Use "SMC-..." format (e.g. SMC-ADMIN-002)'),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      passwordRegex,
      "Password must include uppercase, lowercase, and a number",
    ),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const generateStudentId = () => {
  // SMC-ADMIN-001 is reserved for the super admin. Start new admins at 002.
  return `SMC-ADMIN-${String(Math.floor(Math.random() * 900) + 100).slice(-3)}`;
};

const generatePassword = (length = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  // Ensure policy: at least one upper, one lower, one digit.
  return out.join("");
};

const CreateAdminModal = ({ open, onClose, onSuccess }: Props) => {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState<{ studentId: string; password: string } | null>(
    null,
  );

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
      studentId: "",
      password: "",
    },
  });

  const fillRandom = () => {
    const sid = generateStudentId();
    const pw = generatePassword(10);
    setValue("studentId", sid, { shouldValidate: true });
    setValue("password", pw, { shouldValidate: true });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await createUser({
        name: data.name,
        studentId: data.studentId,
        password: data.password,
        role: "ADMIN",
      }).unwrap();
      setGenerated({ studentId: data.studentId, password: data.password });
      toast.success("Admin created");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create admin");
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
                Admin created. Share these credentials securely — they won't be
                shown again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-card p-3">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono text-sm font-semibold">
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
                <Label className="text-xs text-muted-foreground">Password</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="adminStudentId">User ID *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={fillRandom}
                >
                  Generate
                </Button>
              </div>
              <Input
                id="adminStudentId"
                placeholder="SMC-ADMIN-002"
                {...register("studentId")}
              />
              {errors.studentId && (
                <p className="text-sm text-destructive">
                  {errors.studentId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="adminPassword">Initial Password *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setValue("password", generatePassword(10), { shouldValidate: true })}
                >
                  Generate
                </Button>
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