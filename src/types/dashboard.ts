import { TBatchDay, TBatchTime, THscBatch } from "./student";
import { TActivityLog } from "./activityLog";

export type TAdminDashboardCards = {
  totalStudents: number;
  fullyPaidStudents: number;
  pendingPaymentStudents: number;
  overdueRecords: number;
  collectedThisMonth: number;
  collectedAllTime: number;
  todayAttendance: number;
  monthAttendance: number;
};

export type TAdminBatchGroup = {
  hscBatch: THscBatch;
  batchDay: TBatchDay;
  batchTime: TBatchTime;
  studentCount: number;
};

export type TAdminDashboardData = {
  cards: TAdminDashboardCards;
  recentActivities: TActivityLog[];
  batchGroups: TAdminBatchGroup[];
  generatedAt: string;
};

export type TStudentCourseSummary = {
  id: string;
  courseName: string;
  fee: number;
  paid: number;
  due: number;
  isCompleted: boolean;
};

export type TStudentDashboardData = {
  profile: {
    studentId: string;
    name: string;
    nickname?: string | null;
    mobile: string;
  };
  courses: TStudentCourseSummary[];
  attendance: {
    recent: Array<{ id: string; date: string; checkInAt: string; method: string }>;
    thisMonth: number;
  };
  totalDue: number;
};