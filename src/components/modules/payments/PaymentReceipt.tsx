"use client";

import dayjs from "dayjs";
import { Separator } from "@/components/ui/separator";
import { formatPaymentMethodLabel } from "@/constants/labels";
import { instituteInfo } from "@/constants/institute";
import { formatReceiptNumber } from "@/utils/receipt";
import PaymentSeal from "@/components/modules/payments/PaymentSeal";
import type { TPaymentRecord } from "@/types/payment";

type Props = {
  payment: TPaymentRecord;
  studentName: string;
  /** Human-readable student id (e.g. the StudentUser id shown in tables). */
  studentId: string;
  /** Student's mobile number (optional — only shown when provided). */
  studentMobile?: string;
  /** HSC batch label (e.g. "HSC 26") — optional. */
  studentBatch?: string;
  /** Current overall payment status: PAID / PARTIAL / PENDING. */
  paymentStatus?: "PAID" | "PARTIAL" | "PENDING";
  courseName?: string;
  /** Total course fee — used for the breakdown. */
  fee?: number;
  /** Sum of all payments made before this one for the same course. */
  previouslyPaid?: number;
  collectedByName?: string;
  collectedByRole?: string;
};

const Money = ({ value }: { value: number | string | null | undefined }) => (
  <span>৳{Number(value ?? 0).toLocaleString()}</span>
);

const StatusBadge = ({
  status,
}: {
  status: NonNullable<Props["paymentStatus"]>;
}) => {
  const styles: Record<NonNullable<Props["paymentStatus"]>, string> = {
    PAID: "bg-emerald-100 text-emerald-800 border-emerald-300",
    PARTIAL: "bg-amber-100 text-amber-800 border-amber-300",
    PENDING: "bg-red-100 text-red-800 border-red-300",
  };
  const labels: Record<NonNullable<Props["paymentStatus"]>, string> = {
    PAID: "FULLY PAID",
    PARTIAL: "PARTIAL",
    PENDING: "PENDING",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

/**
 * A self-contained payment receipt. Renders on screen inside the
 * PaymentReceiptView overlay and is the same element the print dialog uses.
 * The root element carries the `.print-receipt` class so the global
 * @media print stylesheet can isolate it.
 */
const PaymentReceipt = ({
  payment,
  studentName,
  studentId,
  studentMobile,
  studentBatch,
  paymentStatus,
  courseName,
  fee,
  previouslyPaid,
  collectedByName,
  collectedByRole,
}: Props) => {
  const amount = Number(payment.amount);
  const paidAt = payment.paidAt ? dayjs(payment.paidAt) : dayjs();
  const receiptNo = formatReceiptNumber(payment.id, payment.paidAt);
  const totalFee = Number(fee ?? 0);
  const previous = Number(previouslyPaid ?? 0);
  // "Total Paid" on the receipt is the running total — previous payments
  // (across this enrollment) plus the amount being recorded right now.
  const totalPaidRunning = previous + amount;
  /*
   * Status reconciliation.
   *
   * The `paymentStatus` prop is sourced from the caller's cached student
   * profile — typically `StudentCourse.status` snapshotted by the list
   * endpoint. That snapshot can be STALE relative to the receipt: when
   * the caller records a new payment via the modal, the receipt renders
   * BEFORE the post-mutation refetch lands, so the prop still says
   * PENDING/PARTIAL even though the just-recorded payment made the
   * enrollment fully settled.
   *
   * To avoid the confusing "this receipt says PENDING but the math adds
   * up to PAID" state, we recompute the status from the math whenever
   * the caller supplied a `fee` (the only inputs we trust the
   * reconciliation on). The caller's `paymentStatus` is treated as the
   * authoritative truth only when no `fee` is available — that's the
   * legacy / fallback receipt shape where we don't have enough
   * information to derive it ourselves.
   *
   * Manual overrides (admin accepted a partial payment as full) are
   * forwarded through the prop as PAID, which the reconciliation
   * correctly accepts as the floor — see the >= check below.
   */
  const reconciledStatus: NonNullable<Props["paymentStatus"]> =
    fee !== undefined && fee !== null
      ? totalPaidRunning >= totalFee
        ? "PAID"
        : totalPaidRunning > 0
          ? "PARTIAL"
          : "PENDING"
      : (paymentStatus ?? "PENDING");
  // Honour an explicit admin PAID override even when the math wouldn't
  // reach PAID — e.g. staff wrote off a partial balance. This matches the
  // backend's record-payment override path: an explicit PAID means the
  // enrollment is settled for accounting purposes regardless of the
  // math.
  const effectiveStatus: NonNullable<Props["paymentStatus"]> =
    reconciledStatus === "PAID" || paymentStatus === "PAID"
      ? "PAID"
      : reconciledStatus;
  // When the enrollment is fully settled, the per-payment "Amount Paid" /
  // "Paid Today" lines are redundant — the running total already shows
  // the settled amount and the PAID seal + 0 balance make it obvious the
  // enrollment is closed. Hide them so the receipt isn't cluttered with
  // numbers that say the same thing twice.
  const isFullyPaid = effectiveStatus === "PAID";
  /*
   * Balance Due shown on the receipt. When the enrollment is marked
   * PAID — including via a manual override where staff accepted a
   * partial payment as full — we honor that and show 0. The rest of
   * the receipt still surfaces the actual amounts so the math is
   * transparent.
   */
  const balance = isFullyPaid ? 0 : Math.max(0, totalFee - totalPaidRunning);

  // A short, human-readable slice of the payment id so the receipt can be
  // cross-referenced with the database without exposing the full UUID.
  const shortPaymentId = (payment.id || "").slice(-8).toUpperCase();

  const dateLabel = paidAt.isValid()
    ? paidAt.format("MMM D, YYYY · h:mm A")
    : "—";

  return (
    <div className="relative print-receipt bg-white text-black font-sans p-8">
      {/* Institute header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          {instituteInfo.name}
        </h1>
        {instituteInfo.address && (
          <p className="text-xs">{instituteInfo.address}</p>
        )}
        <div className="text-xs flex justify-center gap-3 flex-wrap">
          {instituteInfo.phone && <span>Phone: {instituteInfo.phone}</span>}
          {instituteInfo.email && <span>Email: {instituteInfo.email}</span>}
        </div>
      </div>

      <Separator className="my-4 bg-black/60" />

      {/* Receipt title + IDs */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wider">
            Payment Receipt
          </h2>
          <p className="text-xs text-neutral-600">Issued on {dateLabel}</p>
        </div>
        <div className="text-right space-y-1">
          <div>
            <p className="text-[10px] uppercase text-neutral-600">
              Receipt No.
            </p>
            <p className="font-mono font-semibold text-sm">{receiptNo}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-neutral-600">Payment ID</p>
            <p className="font-mono text-xs">#{shortPaymentId}</p>
          </div>
        </div>
      </div>

      <Separator className="my-3 bg-black/40" />

      {/* Student & course details */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Student Name</p>
          <p className="font-medium">{studentName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Student ID</p>
          <p className="font-mono">{studentId}</p>
        </div>
        {studentMobile && (
          <div>
            <p className="text-[10px] uppercase text-neutral-600">Mobile</p>
            <p className="font-mono">{studentMobile}</p>
          </div>
        )}
        {studentBatch && (
          <div>
            <p className="text-[10px] uppercase text-neutral-600">HSC Batch</p>
            <p className="font-medium">{studentBatch}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Course</p>
          <p className="font-medium">
            {courseName ? courseName.replace(/_/g, " ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">
            Payment Status
          </p>
          <div className="pt-0.5">
            {/* Render the reconciled status (math + override floor) rather
                than the raw `paymentStatus` prop. The prop can be stale
                relative to the just-recorded payment; `effectiveStatus`
                reflects the actual settlement state of this receipt. */}
            <StatusBadge status={effectiveStatus} />
          </div>
        </div>
      </div>

      <Separator className="my-3 bg-black/40" />

      {/* Payment details — every input the staff member entered. When the
          enrollment is fully settled we keep the "Amount Paid" label
          visible but mask the value with "--" (same rule as the
          breakdown's "Previously Paid" / "Paid Today" rows) so the
          receipt doesn't restate the per-payment numbers on a closed
          enrollment. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Amount Paid</p>
          <p className="font-semibold text-base">
            {isFullyPaid ? "---" : <Money value={amount} />}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">
            Payment Method
          </p>
          <p className="font-medium">
            {formatPaymentMethodLabel(payment.method)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">
            Transaction ID
          </p>
          <p className="font-mono">{payment.transactionId || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">
            Sender Number
          </p>
          <p className="font-mono">{payment.senderNumber || "—"}</p>
        </div>
        {payment.note && (
          <div className="col-span-2">
            <p className="text-[10px] uppercase text-neutral-600">Note</p>
            <p>{payment.note}</p>
          </div>
        )}
      </div>

      <Separator className="my-3 bg-black/40" />

      {/* Breakdown — wrapped in a relative container so the PAID seal
          can be absolutely-positioned as a watermark behind the table
          rows. The seal sits dead-center vertically and horizontally,
          drops its opacity so the row text stays readable, and only
          appears when the enrollment is fully settled (balance 0,
          which also covers manual overrides to PAID). */}
      {fee !== undefined && fee !== null ? (
        /*
         * Watermark PAID seal layout.
         *
         * The outer container is `overflow-visible` (not `overflow-hidden`)
         * so the seal — which is intentionally sized LARGER than the table
         * itself — is not clipped by the rounded border. The seal sits in
         * `absolute inset-0` with `flex items-center justify-center` so its
         * visual centre coincides with the table's centre, then a
         * `style={{ opacity: 0.22 }}` drops it to a true watermark density.
         *
         * To keep the seal visible BEHIND the header ("Description / Amount")
         * and footer ("Balance Due") bands, those two bands are rendered
         * with `bg-neutral-100/70` instead of the opaque `bg-neutral-100` so
         * the emerald ring + PAID text bleed through. Body rows keep their
         * white background to preserve readability of the numbers.
         */
        <div className="relative border border-black/40 rounded-sm overflow-visible text-sm">
          {balance === 0 && (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-visible">
              <div style={{ opacity: 0.5 }}>
                <PaymentSeal
                  size={280}
                  rotate={-18}
                  color="#047857"
                  dateLabel={dayjs(payment.paidAt ?? undefined).format(
                    "MMM D, YYYY",
                  )}
                />
              </div>
            </div>
          )}
          {/* Row content sits above the seal via relative + z-10. The
              header and footer rows use a semi-transparent background
              so the watermark stays visible through them. */}
          <div className="relative z-10">
            <div className="grid grid-cols-2 px-3 py-2 bg-neutral-100/70">
              <span className="font-medium">Description</span>
              <span className="font-medium text-right">Amount</span>
            </div>
            <div className="grid grid-cols-2 px-3 py-1.5">
              <span>Total Course Fee</span>
              <span className="text-right">
                <Money value={totalFee} />
              </span>
            </div>
            <div className="grid grid-cols-2 px-3 py-1.5 border-t border-black/20">
              <span>Previously Paid</span>
              {/* When the enrollment is fully settled we keep the row
                  label visible (so the receipt still reads as a
                  breakdown) but mask the amount with "--". The PAID
                  seal + 0 balance + Total Paid row already convey the
                  settlement, so the individual payment amounts add no
                  signal — only noise — once the enrollment is closed. */}
              <span className="text-right">
                {isFullyPaid ? "---" : <Money value={previous} />}
              </span>
            </div>
            {/* "Paid Today" — same masking rule as Previously Paid. The
                label is kept so the breakdown still reads naturally,
                but the amount is masked with "--" on a fully-paid
                receipt. (The earlier implementation hid the entire row;
                we now keep it visible with a masked amount per the
                product request.) */}
            <div className="grid grid-cols-2 px-3 py-1.5 border-t border-black/20">
              <span>Paid Today</span>
              <span className="text-right">
                {isFullyPaid ? "---" : <Money value={amount} />}
              </span>
            </div>
            <div className="grid grid-cols-2 px-3 py-1.5 border-t border-black/20 font-semibold">
              <span>Total Paid</span>
              <span className="text-right">
                {isFullyPaid ? "---" : <Money value={totalPaidRunning} />}
              </span>
            </div>
            <div className="grid grid-cols-2 px-3 py-1.5 border-t border-black/40 bg-neutral-100/70 font-semibold">
              <span>Balance Due</span>
              <span className="text-right">
                <Money value={balance} />
              </span>
            </div>
          </div>
        </div>
      ) : (
        // No fee on file — render a one-line "Amount Paid" receipt. Same
        // hide rule as the breakdown above: when fully settled, the PAID
        // seal alone is enough; showing "Amount Paid" again would restate
        // what the seal + balance already imply.
        <div className="relative border border-black/40 rounded-sm px-3 py-3 flex items-center justify-between text-sm">
          {balance === 0 && (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-visible">
              <div style={{ opacity: 0.5 }}>
                <PaymentSeal
                  size={180}
                  rotate={-18}
                  color="#047857"
                  dateLabel={dayjs(payment.paidAt ?? undefined).format(
                    "MMM D, YYYY",
                  )}
                />
              </div>
            </div>
          )}
          {/* No fee on file — single-row fallback. Mask the amount the same
              way as the breakdown when fully settled. */}
          <>
            <span className="relative z-10 font-medium">Amount Paid</span>
            <span className="relative z-10 font-semibold text-base">
              {isFullyPaid ? "--" : <Money value={amount} />}
            </span>
          </>
        </div>
      )}

      {/* Collected by + signature */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Collected by</p>
          <p className="font-medium">
            {collectedByName || payment.collectedBy || "—"}
            {collectedByRole ? ` (${collectedByRole})` : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="border-b border-dashed border-black h-8" />
          <p className="text-[10px] uppercase text-neutral-600 mt-1">
            Authorized Signature
          </p>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-neutral-600">
        Thank you for your payment.
      </p>
    </div>
  );
};

export default PaymentReceipt;
