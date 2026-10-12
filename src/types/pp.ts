/**
 * PP (referral) types — the admin-managed roster of referrers and
 * the payout ledger. See `smart-mmc-backend/src/app/modules/pp/`
 * for the service-layer counterpart and the prisma schema for
 * the field-level docstrings.
 *
 * The shape comes back from the API already JSON-parsed and with
 * Prisma Decimal fields converted to `number` (the backend's
 * standard pattern; the rest of the frontend relies on it).
 */

export type TPpMethod = "CASH" | "BKASH" | "NAGAD" | "BANK" | "OTHER";

/**
 * Base PP shape — what the POST /pp endpoint returns and what the
 * list endpoint embeds in `createdBy`.
 */
export type TPp = {
  id: string;
  name: string;
  createdBy: {
    id: string;
    name: string;
    role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  };
  createdAt: string;
  updatedAt: string;
};

/**
 * TPp as returned by GET /pp — adds the lightweight `_count` of
 * students referred and payouts made. The management page reads
 * these counts to render the card body without opening the detail.
 */
export type TPpWithStats = TPp & {
  _count: {
    students: number;
    payments: number;
  };
};

/**
 * A single row in the PP payout ledger. Distinct from the existing
 * `TPayment` type (which is money coming IN from students) — this
 * is money going OUT to the PP.
 *
 * `studentId` is optional: null means the payout is a lump sum
 * unattributed to any specific student. When set, the row appears
 * on the student's detail page as part of their per-student
 * payout history.
 */
export type TPpPayment = {
  id: string;
  ppId: string;
  studentId: string | null;
  amount: number;
  method: TPpMethod;
  paidAt: string;
  paidBy: string;
  note: string | null;
  createdAt: string;
  // Hydrated projection — backend includes the admin who paid
  // so the dialog can show "by X" without a follow-up query.
  paidByUser?: { id: string; name: string };
  // Also hydrated when `studentId` is set, so the dialog can
  // show the linked student as a link.
  student?: { id: string; user: { name: string } } | null;
};

/**
 * TPp as returned by GET /pp/:id — the management page opens this
 * in the detail dialog when the admin clicks a card.
 *
 * The students array is the minimal projection needed to render
 * the "Students referred" table. The payments array is the full
 * payout history sorted newest-first (already done in the service).
 */
export type TPpDetail = TPp & {
  students: Array<{
    id: string;
    ppFee: number | null;
    // Per-student "paid" total — sum of PpPayment.amount across
    // this PP's payouts where `studentId` matches. Computed
    // server-side via a `groupBy` so the detail dialog can show
    // "Paid / Due" per student without a second round-trip.
    // Combined with `ppFee` (nullable), the due is
    // `max(0, ppFee - paid)` — same convention as the existing
    // student-fee due math.
    paid: number;
    user: { name: string };
  }>;
  payments: TPpPayment[];
  _count: { students: number; payments: number };
};

/**
 * POST /pp body — admin creates a new PP. The `name` is the only
 * required field.
 */
export type TCreatePp = { name: string };

/**
 * POST /pp/payment body — admin records a payout.
 *
 * `studentId` is optional: set when the payout is being attributed
 * to a specific student (the per-student history on the student
 * detail page will pick it up). Leave null for a lump-sum payout
 * that just reduces the PP's overall due.
 */
export type TRecordPpPayment = {
  ppId: string;
  studentId?: string | null;
  amount: number;
  method: TPpMethod;
  paidAt?: string; // ISO; backend defaults to "now"
  note?: string;
};

/**
 * Narrow (id, name) row used by the admit form's PP select.
 * Returned by GET /pp/active. Kept minimal so the dropdown is
 * fast even with thousands of students in the system.
 */
export type TPpOption = Pick<TPp, "id" | "name">;