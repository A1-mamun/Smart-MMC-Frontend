import { TCourse, TStudentUser } from "./student";

export type TPaymentMethod = "CASH" | "BKASH" | "NAGAD" | "BANK" | "OTHER";

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
  studentName: string;
  studentUserId: string;
  courseId: string;
  courseName: string;
  totalFee: number;
  paid: number;
  due: number;
  isFullyPaid: boolean;
};

export type TDuePaymentsData = {
  records: TDueRecord[];
  summary: { totalDueStudents: number; totalDueAmount: number };
};