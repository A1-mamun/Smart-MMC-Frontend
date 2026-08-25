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