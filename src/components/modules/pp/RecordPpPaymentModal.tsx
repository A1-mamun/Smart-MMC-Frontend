"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HandCoins, Loader2, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordPpPaymentMutation } from "@/redux/features/pp/pp.api";
import { TPpDetail, TPpMethod } from "@/types/pp";

/**
 * Build the payout-form Zod schema with a per-student `due` cap
 * baked in. The cap is dynamic (it depends on the picked
 * student's `ppFee - paid`), so the schema has to be a factory
 * that closes over the PP detail instead of a module-level
 * constant. `studentId` is required, and `amount` is rejected if
 * it would push the student over their outstanding commission —
 * admins can still under-pay (partial settlement) but not
 * over-pay.
 */
const buildSchema = (pp: TPpDetail) =>
  z.object({
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .max(10_000_000, "Amount looks too large; double-check the value"),
    method: z.enum(["CASH", "BKASH", "NAGAD", "BANK", "OTHER"]),
    // The RHF field holds either a real student id (string) or
    // the sentinel "__none__" (the Select can't store null in a
    // controlled value). The submit handler refuses to POST
    // while the sentinel is set.
    studentId: z.string().min(1, "Pick a student"),
    note: z.string().trim().max(500).optional(),
  })
    // Cross-field cap: amount must not exceed the picked
    // student's outstanding `due`. Doing this on the parent
    // object (instead of on `amount` alone) lets us read the
    // selected `studentId` and look up the matching student in
    // `pp.students`. Under-paying is allowed (partial
    // settlement); over-paying is rejected so the ledger can't
    // record more commission than the PP actually owes the
    // centre for that student.
    .superRefine((data, ctx) => {
      if (data.studentId === NO_STUDENT) return; // studentId error already raised
      const stu = pp.students.find((s) => s.id === data.studentId);
      if (!stu || stu.ppFee == null) return;
      const due = dueFor(stu.ppFee, stu.paid);
      if (data.amount > due) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: `Amount can't exceed this student's outstanding commission (৳${due.toLocaleString()})`,
        });
      }
    });

// Derive form types from a sample instance of the schema so we
// don't have to declare `schema` at module level. The PP detail
// the runtime instance is built with is the same one the parent
// passes in, so the inferred input/output shapes match what
// react-hook-form actually receives.
type FormData = z.input<ReturnType<typeof buildSchema>>;
type FormOutput = z.output<ReturnType<typeof buildSchema>>;

const METHOD_OPTIONS: { value: TPpMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

// Sentinel for the "no student chosen yet" state. RHF's controlled
// `<Select>` can't bind to `null`, so we use a string sentinel and
// translate on submit. Same trick AdmitStudentForm uses for the
// bloodGroup field.
const NO_STUDENT = "__none__";

/**
 * Compute outstanding commission for one student. Mirrors the
 * math the student-fee module uses (`fee - paid`, clamped at 0).
 * `ppFee` is nullable (admin may have back-filled a student
 * without setting a fee) — a null fee means the student has no
 * PP commission owed, so `due = 0`.
 */
const dueFor = (ppFee: number | null, paid: number): number => {
  if (ppFee == null) return 0;
  return Math.max(0, ppFee - paid);
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The PP we're paying out to. */
  pp: TPpDetail;
  /** Optional callback after a successful payout — usually
   *  the parent's refetch, so the dialog updates immediately. */
  onRecorded?: () => void;
};

/**
 * Modal for recording a payout to a PP. Workflow is now
 * student-first to match how commission actually flows:
 *
 *   1. Pick the student. Picker is filtered to students with
 *      `due > 0` (the only ones who still owe commission). A
 *      student with `ppFee = null` is excluded — they have no
 *      commission in play.
 *   2. The amount field auto-fills with the selected student's
 *      outstanding due. The admin can still override (e.g. a
 *      partial settlement that pays a chunk now and the rest
 *      later). The helper text under the field shows what
 *      "default" was used so the auto-fill isn't mysterious.
 *   3. Pick the method, optionally add a note.
 *   4. Submit. `paidAt` is stamped server-side at insert time.
 *
 * Lump-sum (unattributed) payouts are no longer exposed from
 * this entry point — the only payouts you can record here are
 * the ones tied to a specific student. The previous
 * "— Lump sum —" sentinel is gone.
 */
const RecordPpPaymentModal = ({ open, onOpenChange, pp, onRecorded }: Props) => {
  const [recordPpPayment, { isLoading }] = useRecordPpPaymentMutation();

  // The students we show in the picker. Same source as the PP
  // detail table — `pp.students` — but filtered to those with a
  // non-null `ppFee` AND a positive outstanding due. We do the
  // filter client-side because the PP list is small (PPs rarely
  // have more than a few dozen students referred).
  const dueStudents = useMemo(
    () => pp.students.filter((s) => s.ppFee != null && dueFor(s.ppFee, s.paid) > 0),
    [pp.students],
  );

  // Schema is rebuilt on every render so the `due` cap stays in
  // sync with the latest `pp.students` (the parent can refetch
  // while the modal is open). The cost is one extra factory
  // call per render — trivial, and the `superRefine` only runs
  // on submit / validation, not on every keystroke.
  const schema = useMemo(() => buildSchema(pp), [pp]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      method: "CASH",
      studentId: NO_STUDENT,
      note: "",
    },
  });

  // The currently selected student id (or the sentinel). Watched
  // so the auto-fill effect below can react to changes.
  const selectedStudentId = watch("studentId");

  // Reset on every fresh open so a previous attempt's selection /
  // amount doesn't leak into the next one. `studentId` returns
  // to the sentinel, which means the user must pick a student
  // again — the auto-fill below will then set the amount.
  useEffect(() => {
    if (open) {
      reset({
        amount: undefined,
        method: "CASH",
        studentId: NO_STUDENT,
        note: "",
      });
    }
  }, [open, reset]);

  // Auto-fill the amount whenever the student selection changes
  // and the admin hasn't already typed something different. We
  // track "manually edited" with a local flag so the auto-fill
  // doesn't fight the user — once they type, the field is theirs.
  const [amountEdited, setAmountEdited] = useState(false);
  useEffect(() => {
    if (amountEdited) return;
    if (selectedStudentId === NO_STUDENT) return;
    const stu = pp.students.find((s) => s.id === selectedStudentId);
    if (!stu || stu.ppFee == null) return;
    const due = dueFor(stu.ppFee, stu.paid);
    setValue("amount", due, { shouldValidate: true, shouldDirty: true });
  }, [selectedStudentId, pp.students, setValue, amountEdited]);

  // The amount that will be shown as "default" in the helper
  // text. Re-derived on every render so the caption stays
  // accurate when the user changes the student.
  const defaultAmount = useMemo(() => {
    if (selectedStudentId === NO_STUDENT) return null;
    const stu = pp.students.find((s) => s.id === selectedStudentId);
    if (!stu || stu.ppFee == null) return null;
    return dueFor(stu.ppFee, stu.paid);
  }, [selectedStudentId, pp.students]);

  const onSubmit = async (data: FormOutput) => {
    // Translate the sentinel back to a real (or absent) studentId
    // before posting. With `studentId` now required in the schema
    // this branch is unreachable in practice, but the guard keeps
    // the wire payload clean.
    if (data.studentId === NO_STUDENT) {
      toast.error("Pick a student first");
      return;
    }
    const payload: {
      ppId: string;
      amount: number;
      method: TPpMethod;
      studentId: string;
      note?: string;
    } = {
      ppId: pp.id,
      amount: data.amount,
      method: data.method,
      studentId: data.studentId,
    };
    if (data.note) payload.note = data.note;

    try {
      await recordPpPayment(payload).unwrap();
      toast.success("Payout recorded");
      onRecorded?.();
      onOpenChange(false);
    } catch (err) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to record payout";
      toast.error(msg);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setAmountEdited(false);
    onOpenChange(false);
  };

  // Empty-state copy. If the PP has no students with outstanding
  // commission, the form is dead — we render a friendly message
  // and disable the submit button so the user doesn't get stuck
  // staring at an empty picker.
  const nothingToPay = !isLoading && dueStudents.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-primary" />
            Record Payout — {pp.name}
          </DialogTitle>
          <DialogDescription>
            Pick the student this payout is for. The amount field
            pre-fills with their outstanding commission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Student picker — required, listed first. Each option
              shows the (paid / fee · due) breakdown so the admin
              can pick with full context. The picker is sourced
              from `pp.students` filtered to those with `due > 0`. */}
          <div className="space-y-2">
            <Label>
              Student <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Switching students should reset the
                    // "manually edited" flag so the new student's
                    // due auto-fills into the amount field.
                    setAmountEdited(false);
                  }}
                  value={field.value ?? NO_STUDENT}
                  disabled={dueStudents.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        dueStudents.length === 0
                          ? "No students with outstanding commission"
                          : "Select a student"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {dueStudents.map((s) => {
                      const due = dueFor(s.ppFee, s.paid);
                      const paid = s.paid;
                      const fee = s.ppFee ?? 0;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.user.name} · ৳{paid.toLocaleString()} / ৳
                          {fee.toLocaleString()} (৳{due.toLocaleString()} due)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.studentId && (
              <p className="text-sm text-destructive">
                {errors.studentId.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-amt">
              Amount (৳) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pp-amt"
              type="number"
              step="0.01"
              min="0"
              // Browser-level cap: the spinners won't go past the
              // student's outstanding commission. The Zod
              // superRefine in `buildSchema` is the authoritative
              // check (a typed value can still bypass the HTML
              // attribute), but this gives the admin a hint at
              // input time. `max` is omitted when no student is
              // picked so the placeholder still makes sense.
              max={defaultAmount != null ? defaultAmount : undefined}
              placeholder={defaultAmount != null ? String(defaultAmount) : "e.g. 500"}
              {...register("amount", {
                // Treat any user input as a manual override so
                // the auto-fill effect stops re-setting the
                // field. The flag resets on student change so
                // the new student's due gets a fresh chance to
                // auto-fill.
                onChange: () => setAmountEdited(true),
              })}
            />
            {defaultAmount != null ? (
              <p className="text-xs text-muted-foreground">
                Default: ৳{defaultAmount.toLocaleString()} (the
                student&apos;s outstanding commission). You can
                override for a partial settlement.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pick a student above to auto-fill with their
                outstanding commission.
              </p>
            )}
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Method <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? "CASH"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-note">Note (optional)</Label>
            <Textarea
              id="pp-note"
              placeholder="e.g. Q1 settlement, partial"
              rows={2}
              {...register("note")}
            />
            {errors.note && (
              <p className="text-sm text-destructive">{errors.note.message}</p>
            )}
          </div>

          {nothingToPay && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                All students linked to this PP are fully paid. Nothing
                to record right now.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || nothingToPay}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Record Payout</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPpPaymentModal;
