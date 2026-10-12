"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HandCoins,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetPpDetailQuery } from "@/redux/features/pp/pp.api";
import { TPpPayment } from "@/types/pp";
import RecordPpPaymentModal from "./RecordPpPaymentModal";

/**
 * Format a ৳ amount. The convention across the codebase is just
 * `৳{n.toLocaleString()}` (see ReceiptTemplate, PaymentReceipt,
 * PaymentsPage). The payments module doesn't use Intl.NumberFormat
 * with `BDT` — keeping the same look.
 */
const fmt = (n: number) => `৳${n.toLocaleString()}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // YYYY-MM-DD in the admin's local timezone (the server stores
  // UTC; admins are in UTC+6 so this gives them the date they
  // think they're looking at).
  return d.toLocaleDateString("en-CA");
};

type Props = {
  ppId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * PP detail dialog. Opens from the management grid when the
 * admin clicks a card. Shows the three "Owed / Paid / Due" stats,
 * a table of students referred, and a table of payouts.
 *
 * The "Owed" total is the sum of student.ppFee across the PP's
 * students. "Paid" is the sum of payment.amount. "Due" is the
 * difference. The math runs client-side because the backend
 * returns the raw arrays; computing it inline is cheaper than
 * asking the server to do it on every render.
 */
const PpDetailDialog = ({ ppId, open, onOpenChange }: Props) => {
  const { data, isLoading, isError, refetch } = useGetPpDetailQuery(ppId, {
    skip: !open,
  });
  const [recordOpen, setRecordOpen] = useState(false);

  const detail = data?.data;

  // Compute the three totals from the arrays the backend
  // returned. The student `ppFee` may be null (admin back-filled
  // a student without setting a fee) — we treat null as 0 so
  // it doesn't blow up the sum.
  const totals = useMemo(() => {
    if (!detail) return { owed: 0, paid: 0, due: 0 };
    const owed = detail.students.reduce(
      (s, st) => s + Number(st.ppFee ?? 0),
      0,
    );
    const paid = detail.payments.reduce(
      (s, p: TPpPayment) => s + Number(p.amount),
      0,
    );
    return { owed, paid, due: owed - paid };
  }, [detail]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" />
              {detail?.name ?? "PP"}
            </DialogTitle>
            {detail && (
              <DialogDescription>
                Added by {detail.createdBy.name} on{" "}
                {formatDate(detail.createdAt)}
              </DialogDescription>
            )}
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading PP details…
            </div>
          ) : isError || !detail ? (
            <div className="flex items-center gap-2 py-8 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Couldn&apos;t load this PP. It may have been deleted.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats row: Owed / Paid / Due. The "Due" cell
                  flips red when > 0, green when 0 — matches the
                  student-payments "due" pill convention. */}
              <div className="grid grid-cols-3 gap-3">
                <StatPill
                  label="Owed"
                  value={fmt(totals.owed)}
                  tone="muted"
                />
                <StatPill
                  label="Paid"
                  value={fmt(totals.paid)}
                  tone="muted"
                />
                <StatPill
                  label="Due"
                  value={fmt(totals.due)}
                  tone={totals.due > 0 ? "danger" : "success"}
                />
              </div>

              {/* Students referred — now shows paid/due per student
                  so the admin can see at a glance which students
                  still owe commission. "Due" mirrors the red-when-
                  positive / green-when-zero treatment the top
                  "Due" stat pill uses. */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Users className="h-4 w-4" />
                  Students referred ({detail.students.length})
                </h3>
                {detail.students.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No students linked to this PP yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2 text-right">PP Fee</th>
                          <th className="px-3 py-2 text-right">Paid</th>
                          <th className="px-3 py-2 text-right">Due</th>
                          <th className="px-3 py-2 text-right">View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.students.map((s) => {
                          const fee = s.ppFee ?? 0;
                          const paid = s.paid ?? 0;
                          const due = Math.max(0, fee - paid);
                          const dueClass =
                            s.ppFee == null
                              ? "text-muted-foreground"
                              : due > 0
                                ? "text-destructive font-semibold"
                                : "text-emerald-600 dark:text-emerald-400 font-semibold";
                          return (
                            <tr key={s.id} className="border-t">
                              <td className="px-3 py-2 font-medium">
                                {s.user.name}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {s.ppFee != null ? fmt(s.ppFee) : "—"}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {fmt(paid)}
                              </td>
                              <td className={`px-3 py-2 text-right ${dueClass}`}>
                                {fmt(due)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Link
                                  href={`/dashboard/students/${s.id}`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  Open
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Payout history — the "PP payment table" the
                  user asked for. Newest first (already sorted
                  server-side). */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <HandCoins className="h-4 w-4" />
                  Payout history ({detail.payments.length})
                </h3>
                {detail.payments.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No payouts recorded yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">Method</th>
                          <th className="px-3 py-2">Paid by</th>
                          <th className="px-3 py-2">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.payments.map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="px-3 py-2 text-xs">
                              {formatDate(p.paidAt)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {fmt(p.amount)}
                            </td>
                            <td className="px-3 py-2">{p.method}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {p.paidByUser?.name ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {p.student ? (
                                <span className="inline-flex items-center gap-1">
                                  →{" "}
                                  <Link
                                    href={`/dashboard/students/${p.student.id}`}
                                    className="text-primary hover:underline"
                                  >
                                    {p.student.user.name}
                                  </Link>
                                </span>
                              ) : null}
                              {p.note ? (
                                <span className="ml-1 italic">
                                  {p.note}
                                </span>
                              ) : null}
                              {!p.student && !p.note ? "—" : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <Loader2
                className={`h-4 w-4 ${isLoading ? "animate-spin" : "opacity-0"}`}
              />
              <span>Refresh</span>
            </Button>
            <Button
              type="button"
              onClick={() => setRecordOpen(true)}
              // Disabled when the PP has no referred students —
              // there's no student to attribute the payout to
              // (the modal's picker is also empty in that case,
              // and the submit button there is gated the same
              // way). The tooltip via `title` explains why so the
              // button doesn't look broken.
              disabled={!detail || detail.students.length === 0}
              title={
                detail && detail.students.length === 0
                  ? "This PP has no referred students yet — link a student to this PP from the admit or edit form first."
                  : undefined
              }
            >
              <Plus className="h-4 w-4" />
              <span>Record payment</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detail && (
        <RecordPpPaymentModal
          open={recordOpen}
          onOpenChange={setRecordOpen}
          pp={detail}
          onRecorded={() => refetch()}
        />
      )}
    </>
  );
};

const StatPill = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "success" | "danger";
}) => {
  const toneClasses =
    tone === "success"
      ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border bg-muted/30 text-foreground";
  const Icon = tone === "success" ? CheckCircle2 : null;
  return (
    <div className={`rounded-lg border p-3 ${toneClasses}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5" />}
      </div>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
};

export default PpDetailDialog;