"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HandCoins, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePpMutation } from "@/redux/features/pp/pp.api";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

type FormData = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Tiny one-field "Add PP" modal. Name only — PP has no other
 * required data. The created row will appear in the management
 * grid immediately (the list query is invalidated on success).
 */
const AddPpModal = ({ open, onOpenChange }: Props) => {
  const [createPp, { isLoading }] = useCreatePpMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData, any, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  // Reset the form whenever the modal is freshly opened, so a
  // previously-typed name from a cancelled open doesn't leak in.
  useEffect(() => {
    if (open) reset({ name: "" });
  }, [open, reset]);

  const onSubmit = async (data: FormOutput) => {
    try {
      await createPp({ name: data.name }).unwrap();
      toast.success("PP added");
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to add PP";
      toast.error(msg);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // don't allow close mid-submit
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-primary" />
            Add PP
          </DialogTitle>
          <DialogDescription>
            A referrer the centre pays a fee to when they bring a student in.
            Name only — phone / email are not tracked here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pp-name">PP name *</Label>
            <Input
              id="pp-name"
              placeholder="e.g. Rahim Bhai"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Add PP</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPpModal;