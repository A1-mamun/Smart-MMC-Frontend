"use client";
import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordPaymentMutation } from "@/redux/features/payment/payment";
import { paymentMethods } from "@/constants/courseNames";
import { TStudent, TPayment } from "@/types/student";
import type { TPaymentRecord } from "@/types/payment";

const schema = z.object({
  studentCourseId: z.string().uuid().optional(),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "BKASH", "NAGAD", "BANK", "OTHER"]),
  transactionId: z.string().optional(),
  senderNumber: z.string().optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export type TCoursePaymentSummary = {
  studentCourseId: string;
  courseName: string;
  fee: number;
  paid: number;
  due: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  student: TStudent;
  /** Optional summary to preselect a specific enrollment with its due amount. */
  preselect?: TCoursePaymentSummary;
  /** Fired after the payment is recorded so the parent can refetch lists. */
  onSuccess?: () => void;
  /** Fired with the created payment so the parent can show a receipt dialog. */
  onRecorded?: (payment: TPaymentRecord) => void;
};

const RecordPaymentModal = ({ open, onClose, student, preselect, onSuccess, onRecorded }: Props) => {
  const [recordPayment, { isLoading }] = useRecordPaymentMutation();
  const [submitting, setSubmitting] = useState(false);

  const summaries = useMemo<TCoursePaymentSummary[]>(() => {
    const s = student.studentCourses ?? [];
    return s
      .filter((sc) => !sc.isCompleted)
      .map((sc) => {
        const paid = (student.payments ?? [])
          .filter((p: TPayment) => p.studentCourseId === sc.id)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const fee = Number(sc.course?.fee ?? 0);
        return {
          studentCourseId: sc.id,
          courseName: sc.course?.name ?? "Course",
          fee,
          paid,
          due: Math.max(0, fee - paid),
        };
      });
  }, [student]);

  const defaultStudentCourseId =
    preselect?.studentCourseId ??
    (summaries.length === 1 ? summaries[0].studentCourseId : "");
  const defaultAmount = preselect?.due ?? (summaries.length === 1 ? summaries[0].due : 0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentCourseId: defaultStudentCourseId || undefined,
      amount: defaultAmount,
      method: "CASH",
    },
  });

  const watchedCourseId = watch("studentCourseId");
  const selectedSummary = summaries.find(
    (s) => s.studentCourseId === watchedCourseId,
  );

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload: any = {
        studentId: student.id,
        amount: data.amount,
        method: data.method,
      };
      if (data.studentCourseId) payload.studentCourseId = data.studentCourseId;
      if (data.transactionId) payload.transactionId = data.transactionId;
      if (data.senderNumber) payload.senderNumber = data.senderNumber;
      if (data.note) payload.note = data.note;
      const res = await recordPayment(payload).unwrap();
      toast.success("Payment recorded");
      // Notify the parent so it can refetch lists AND auto-open the receipt
      // dialog (which handles printing). Then close this modal so the staff
      // member sees the receipt dialog immediately.
      const created = (res?.data as TPaymentRecord) ?? null;
      if (created) onRecorded?.(created);
      onSuccess?.();
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectCourse = (courseId: string) => {
    setValue("studentCourseId", courseId, { shouldValidate: true });
    const summary = summaries.find((s) => s.studentCourseId === courseId);
    if (summary && summary.due > 0) {
      setValue("amount", summary.due);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{`Record Payment — ${student.user.name}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {summaries.length > 0 && (
            <div className="space-y-2">
              <Label>Course *</Label>
              <Controller
                control={control}
                name="studentCourseId"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      handleSelectCourse(v);
                    }}
                    value={field.value || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {summaries.map((s) => (
                        <SelectItem key={s.studentCourseId} value={s.studentCourseId}>
                          {s.courseName.replace(/_/g, " ")} — Due ৳{s.due.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedSummary && (
                <p className="text-xs text-muted-foreground">
                  Fee ৳{selectedSummary.fee.toLocaleString()} · Paid ৳{selectedSummary.paid.toLocaleString()} · Due ৳{selectedSummary.due.toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (৳) *</Label>
            <Input
              id="amount"
              type="number"
              step="1"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Method *</Label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input id="transactionId" placeholder="(optional)" {...register("transactionId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderNumber">Sender Number</Label>
              <Input id="senderNumber" placeholder="(optional)" {...register("senderNumber")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" placeholder="(optional)" {...register("note")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || isLoading}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentModal;