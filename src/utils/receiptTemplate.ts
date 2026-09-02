import dayjs from "dayjs";
import { formatPaymentMethodLabel } from "@/constants/labels";
import { instituteInfo } from "@/constants/institute";
import { formatReceiptNumber } from "@/utils/receipt";
import type { TPaymentRecord } from "@/types/payment";

type TemplateProps = {
  payment: TPaymentRecord;
  studentName: string;
  studentId: string;
  studentMobile?: string;
  studentBatch?: string;
  paymentStatus?: "PAID" | "PARTIAL" | "PENDING";
  courseName?: string;
  fee?: number;
  previouslyPaid?: number;
  collectedByName?: string;
  collectedByRole?: string;
};

export type { TemplateProps };

const money = (value: number | string | null | undefined) =>
  `৳${Number(value ?? 0).toLocaleString()}`;

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Returns a fully self-contained HTML string for the payment receipt. All
 * styles are inline, no external CSS or Tailwind classes are referenced.
 * This makes the receipt bulletproof when written into a print iframe or
 * any other document.
 */
export const renderReceiptHTML = (props: TemplateProps): string => {
  const {
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
  } = props;

  const amount = Number(payment.amount);
  const paidAt = payment.paidAt ? dayjs(payment.paidAt) : dayjs();
  const receiptNo = formatReceiptNumber(payment.id, payment.paidAt);
  const totalFee = Number(fee ?? 0);
  const previous = Number(previouslyPaid ?? 0);
  const balance = Math.max(0, totalFee - previous - amount);
  const shortPaymentId = (payment.id || "").slice(-8).toUpperCase();
  const dateLabel = paidAt.isValid()
    ? paidAt.format("MMM D, YYYY · h:mm A")
    : "—";

  const statusColors: Record<string, { bg: string; fg: string; bd: string }> = {
    PAID: { bg: "#dcfce7", fg: "#166534", bd: "#86efac" },
    PARTIAL: { bg: "#fef3c7", fg: "#92400e", bd: "#fcd34d" },
    PENDING: { bg: "#fee2e2", fg: "#991b1b", bd: "#fca5a5" },
  };
  const statusLabels: Record<string, string> = {
    PAID: "FULLY PAID",
    PARTIAL: "PARTIAL",
    PENDING: "PENDING",
  };
  const st = paymentStatus ? statusColors[paymentStatus] : null;
  const statusBadge = st
    ? `<span style="display:inline-block;padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;border-radius:4px;background:${st.bg};color:${st.fg};border:1px solid ${st.bd};">${statusLabels[paymentStatus!]}</span>`
    : `<span style="color:#737373;">—</span>`;

  const courseLabel = courseName ? esc(courseName.replace(/_/g, " ")) : "—";

  const breakdownTable =
    fee !== undefined && fee !== null
      ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #4b5563;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="text-align:left;padding:8px 12px;font-weight:600;border-bottom:1px solid #4b5563;">Description</th>
              <th style="text-align:right;padding:8px 12px;font-weight:600;border-bottom:1px solid #4b5563;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:6px 12px;">Total Course Fee</td>
              <td style="padding:6px 12px;text-align:right;">${money(totalFee)}</td>
            </tr>
            <tr style="border-top:1px solid #d4d4d4;">
              <td style="padding:6px 12px;">Previously Paid</td>
              <td style="padding:6px 12px;text-align:right;">${money(previous)}</td>
            </tr>
            <tr style="border-top:1px solid #d4d4d4;font-weight:600;">
              <td style="padding:6px 12px;">Total Paid</td>
              <td style="padding:6px 12px;text-align:right;">${money(amount)}</td>
            </tr>
            <tr style="border-top:1px solid #4b5563;background:#f5f5f5;font-weight:600;">
              <td style="padding:6px 12px;">Balance Due</td>
              <td style="padding:6px 12px;text-align:right;">${money(balance)}</td>
            </tr>
          </tbody>
        </table>`
      : `
        <div style="border:1px solid #4b5563;padding:12px;display:flex;justify-content:space-between;font-size:13px;">
          <span style="font-weight:600;">Amount Paid</span>
          <span style="font-weight:600;">${money(amount)}</span>
        </div>`;

  return `
    <div style="background:#ffffff;color:#000000;font-family:'Poppins',Arial,sans-serif;padding:32px;max-width:210mm;margin:0 auto;box-sizing:border-box;">
      <!-- Institute header -->
      <div style="text-align:center;margin-bottom:8px;">
        <h1 style="font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px 0;">${esc(instituteInfo.name)}</h1>
        ${instituteInfo.address ? `<p style="font-size:12px;margin:0 0 4px 0;">${esc(instituteInfo.address)}</p>` : ""}
        <div style="font-size:12px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          ${instituteInfo.phone ? `<span>Phone: ${esc(instituteInfo.phone)}</span>` : ""}
          ${instituteInfo.email ? `<span>Email: ${esc(instituteInfo.email)}</span>` : ""}
        </div>
      </div>

      <hr style="border:none;border-top:1.5px solid #000;margin:16px 0;" />

      <!-- Receipt title + IDs -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;">
        <div>
          <h2 style="font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0;">Payment Receipt</h2>
          <p style="font-size:12px;color:#525252;margin:4px 0 0 0;">Issued on ${esc(dateLabel)}</p>
        </div>
        <div style="text-align:right;">
          <div>
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Receipt No.</p>
            <p style="font-family:'Geist Mono','Courier New',monospace;font-weight:600;font-size:14px;margin:2px 0 0 0;">${esc(receiptNo)}</p>
          </div>
          <div style="margin-top:8px;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Payment ID</p>
            <p style="font-family:'Geist Mono','Courier New',monospace;font-size:12px;margin:2px 0 0 0;">#${esc(shortPaymentId)}</p>
          </div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #000;margin:12px 0;" />

      <!-- Student & course block -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
        <tr>
          <td style="padding:4px 12px 4px 0;vertical-align:top;width:50%;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Student Name</p>
            <p style="font-weight:600;margin:2px 0 0 0;">${esc(studentName)}</p>
          </td>
          <td style="padding:4px 0;vertical-align:top;width:50%;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Student ID</p>
            <p style="font-family:'Geist Mono','Courier New',monospace;margin:2px 0 0 0;">${esc(studentId)}</p>
          </td>
        </tr>
        ${studentMobile || studentBatch
          ? `<tr>
              ${studentMobile
                ? `<td style="padding:4px 12px 4px 0;vertical-align:top;">
                    <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Mobile</p>
                    <p style="font-family:'Geist Mono','Courier New',monospace;margin:2px 0 0 0;">${esc(studentMobile)}</p>
                  </td>`
                : `<td></td>`}
              ${studentBatch
                ? `<td style="padding:4px 0;vertical-align:top;">
                    <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">HSC Batch</p>
                    <p style="font-weight:600;margin:2px 0 0 0;">${esc(studentBatch)}</p>
                  </td>`
                : `<td></td>`}
            </tr>`
          : ""}
        <tr>
          <td style="padding:4px 12px 4px 0;vertical-align:top;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Course</p>
            <p style="font-weight:600;margin:2px 0 0 0;">${courseLabel}</p>
          </td>
          <td style="padding:4px 0;vertical-align:top;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Payment Status</p>
            <div style="margin-top:2px;">${statusBadge}</div>
          </td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #000;margin:12px 0;" />

      <!-- Payment details -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
        <tr>
          <td style="padding:4px 12px 4px 0;vertical-align:top;width:50%;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Amount Paid</p>
            <p style="font-size:16px;font-weight:700;margin:2px 0 0 0;">${money(amount)}</p>
          </td>
          <td style="padding:4px 0;vertical-align:top;width:50%;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Payment Method</p>
            <p style="font-weight:600;margin:2px 0 0 0;">${esc(formatPaymentMethodLabel(payment.method))}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;vertical-align:top;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Transaction ID</p>
            <p style="font-family:'Geist Mono','Courier New',monospace;margin:2px 0 0 0;">${esc(payment.transactionId || "—")}</p>
          </td>
          <td style="padding:4px 0;vertical-align:top;">
            <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Sender Number</p>
            <p style="font-family:'Geist Mono','Courier New',monospace;margin:2px 0 0 0;">${esc(payment.senderNumber || "—")}</p>
          </td>
        </tr>
        ${payment.note
          ? `<tr>
              <td colspan="2" style="padding:4px 0;vertical-align:top;">
                <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Note</p>
                <p style="margin:2px 0 0 0;">${esc(payment.note)}</p>
              </td>
            </tr>`
          : ""}
      </table>

      <hr style="border:none;border-top:1px solid #000;margin:12px 0;" />

      <!-- Breakdown -->
      ${breakdownTable}

      <!-- Collected by + signature -->
      <div style="margin-top:40px;display:flex;justify-content:space-between;gap:32px;font-size:13px;">
        <div>
          <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Collected by</p>
          <p style="font-weight:600;margin:4px 0 0 0;">${esc(collectedByName || payment.collectedBy || "—")}${collectedByRole ? ` <span style="font-weight:400;">(${esc(collectedByRole)})</span>` : ""}</p>
        </div>
        <div style="text-align:right;flex:1;max-width:240px;">
          <div style="border-bottom:1px dashed #000;height:32px;"></div>
          <p style="font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:0.05em;margin:4px 0 0 0;">Authorized Signature</p>
        </div>
      </div>

      <p style="margin-top:40px;text-align:center;font-size:12px;color:#525252;">Thank you for your payment.</p>
    </div>
  `;
};
