import { TCourse, TStudentUser } from "./student";

export type TPaymentMethod = "CASH" | "BKASH" | "NAGAD" | "BANK" | "OTHER";
// Status values accepted by the override field on record-payment.
export type TPaymentStatusOverride = "PAID" | "PARTIAL" | "PENDING";

export type TPaymentRecord = {
  id: string;
  studentId: string;
  studentCourseId?: string | null;
  amount: number | string;
  method: TPaymentMethod;
  transactionId?: string | null;
  senderNumber?: string | null;
  note?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  collectedBy: string;
  student?: { user: TStudentUser } | null;
  studentCourse?: { course: TCourse } | null;
};

export type TRecordPaymentPayload = {
  studentId: string;
  studentCourseId?: string;
  amount: number;
  method: TPaymentMethod;
  transactionId?: string;
  senderNumber?: string;
  note?: string;
  paidAt?: string;
  dueDate?: string;
  // When set, the backend applies this status to the StudentCourse
  // verbatim instead of auto-tracking by amount. Omit to keep the
  // current fee-based tracking.
  overrideStatus?: TPaymentStatusOverride;
};

export type TStudentPaymentSummary = {
  courseId: string;
  courseName: string;
  fee: number;
  paid: number;
  due: number;
};

export type TStudentPaymentsData = {
  payments: TPaymentRecord[];
  summary: TStudentPaymentSummary[];
};

export type TDueRecord = {
  studentId: string;
  // The StudentCourse enrollment id (not the Course id). Lets the
  // RecordPaymentModal preselect the correct course even when a student
  // is enrolled in multiple batches of the same course.
  studentCourseId?: string;
  studentName: string;
  studentUserId: string;
  // Surfaced so the Due tab's search input can match by mobile, mirroring
  // the All Payments tab's search dimensions.
  studentMobile?: string;
  courseId: string;
  courseName: string;
  totalFee: number;
  paid: number;
  due: number;
  isFullyPaid: boolean;
  // The persisted enrollment status (PAID/PARTIAL/PENDING). Honors manual
  // overrides. The due list filters out rows where this is PAID.
  status?: TPaymentStatusOverride;
};

export type TDuePaymentsData = {
  records: TDueRecord[];
  summary: { totalDueStudents: number; totalDueAmount: number };
};