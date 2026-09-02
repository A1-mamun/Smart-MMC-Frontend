"use client";

import dayjs from "dayjs";
import { Separator } from "@/components/ui/separator";
import { formatPaymentMethodLabel } from "@/constants/labels";
import { instituteInfo } from "@/constants/institute";
import { formatReceiptNumber } from "@/utils/receipt";
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

const StatusBadge = ({ status }: { status: NonNullable<Props["paymentStatus"]> }) => {
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
  const balance = Math.max(0, totalFee - previous - amount);

  // A short, human-readable slice of the payment id so the receipt can be
  // cross-referenced with the database without exposing the full UUID.
  const shortPaymentId = (payment.id || "").slice(-8).toUpperCase();

  const dateLabel = paidAt.isValid()
    ? paidAt.format("MMM D, YYYY · h:mm A")
    : "—";

  return (
    <div className="print-receipt bg-white text-black font-sans p-8">
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
            <p className="text-[10px] uppercase text-neutral-600">Receipt No.</p>
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
          <p className="text-[10px] uppercase text-neutral-600">Payment Status</p>
          <div className="pt-0.5">
            {paymentStatus ? (
              <StatusBadge status={paymentStatus} />
            ) : (
              <span className="text-neutral-500">—</span>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-3 bg-black/40" />

      {/* Payment details — every input the staff member entered */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Amount Paid</p>
          <p className="font-semibold text-base">
            <Money value={amount} />
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Payment Method</p>
          <p className="font-medium">{formatPaymentMethodLabel(payment.method)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Transaction ID</p>
          <p className="font-mono">{payment.transactionId || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-neutral-600">Sender Number</p>
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

      {/* Breakdown */}
      {fee !== undefined && fee !== null ? (
        <div className="border border-black/40 rounded-sm overflow-hidden text-sm">
          <div className="grid grid-cols-2 px-3 py-2 bg-neutral-100">
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
            <span className="text-right">
              <Money value={previous} />
            </span>
          </div>
          <div className="grid grid-cols-2 px-3 py-1.5 border-t border-black/20 font-semibold">
            <span>Total Paid</span>
            <span className="text-right">
              <Money value={amount} />
            </span>
          </div>
          <div className="grid grid-cols-2 px-3 py-1.5 border-t border-black/40 bg-neutral-100 font-semibold">
            <span>Balance Due</span>
            <span className="text-right">
              <Money value={balance} />
            </span>
          </div>
        </div>
      ) : (
        <div className="border border-black/40 rounded-sm px-3 py-3 flex items-center justify-between text-sm">
          <span className="font-medium">Amount Paid</span>
          <span className="font-semibold text-base">
            <Money value={amount} />
          </span>
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
