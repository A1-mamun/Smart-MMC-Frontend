import { THscBatch } from "./student";

export type TAdmissionComparison = {
  currentBatch: THscBatch;
  currentBatchCount: number;
  previousBatch: THscBatch;
  previousBatchCount: number;
  percentChange: number;
  window: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
  };
};

export type TBatchCourseStat = {
  hscBatch: THscBatch;
  courseName: string;
  studentCount: number;
  paidCount: number;
  dueCount: number;
};

export type TCollectionTrendPoint = {
  label: string;
  collected: number;
  count: number;
};

export type TPaymentMethodBreakdown = {
  method: string;
  total: number;
  count: number;
};

/**
 * Per-ONGOING-course aggregate surfaced as a card on the admin
 * dashboard. The financial fields are populated only when the
 * backend caller is SUPER_ADMIN — admins always see `0` for
 * `totalEarned` / `ppFeeTotal` / `netProfit`. The frontend
 * conditionally renders the financial block by reading the
 * auth state; the zeros are there so non-super-admin callers
 * still get a consistent shape.
 */
export type TOngoingCourseStat = {
  id: string;
  name: string;
  hscBatch: THscBatch;
  fee: number;
  studentCount: number;
  /** Sum of Payment.amount across all non-deleted enrollments in this course. SUPER_ADMIN only. */
  totalEarned: number;
  /** Sum of Student.ppFee across enrolled students who were attributed to a referrer. SUPER_ADMIN only. */
  ppFeeTotal: number;
  /** Convenience: totalEarned − ppFeeTotal. SUPER_ADMIN only. */
  netProfit: number;
};