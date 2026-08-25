export type TBloodGroup =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE";

export type TEducationBoard =
  | "DHAKA"
  | "CHITTAGONG"
  | "RAJSHAHI"
  | "COMILLA"
  | "SYLHET"
  | "BARISAL"
  | "JESSORE"
  | "MYMENSINGH"
  | "MADRASAH"
  | "TECHNICAL";

export type THscBatch = "BATCH_25" | "BATCH_26" | "BATCH_27" | "BATCH_28";
export type TCourseName =
  | "HSC_1ST_YEAR"
  | "HSC_2ND_YEAR"
  | "HSC_FINAL_PREPARATION"
  | "ADMISSION";
export type TBatchDay = string;
export type TBatchTime = string;

export type TStudentUser = {
  id: string;
  studentId: string;
  name: string;
  nickname?: string | null;
  status?: string;
  mustChangePassword?: boolean;
  createdAt: string;
};

export type TStudentCourseEnrollment = {
  id: string;
  courseId: string;
  enrolledAt: string;
  isCompleted: boolean;
  completedAt?: string | null;
  course: TCourse;
};

export type TStudentBatch = {
  id: string;
  batchDay: TBatchDay;
  batchTime: TBatchTime;
  hscBatch: THscBatch;
};

export type TStudent = {
  id: string;
  college?: string | null;
  mobile: string;
  bloodGroup: TBloodGroup;
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName: string;
  motherOccupation: string;
  motherMobile: string;
  addressVillage: string;
  addressPostOffice: string;
  addressUpozila: string;
  addressDistrict: string;
  sscInstitute: string;
  sscBoard: TEducationBoard;
  sscPassingYear: number;
  sscGpa: string | number;
  admittedAt: string;
  admittedBy: string;
  user: TStudentUser;
  studentCourses?: TStudentCourseEnrollment[];
  batches?: TStudentBatch[];
  payments?: TPayment[];
  attendance?: TAttendance[];
};

export type TCourse = {
  id: string;
  name: TCourseName;
  description?: string | null;
  fee: string | number;
  hscBatch: THscBatch;
  isActive: boolean;
  batchDays?: TCourseBatchDay[];
};

export type TCourseBatchDay = {
  id: string;
  courseId: string;
  name?: string | null;
  days: string[];
  times: string[];
  position: number;
};

export type TPayment = {
  id: string;
  studentId: string;
  studentCourseId?: string | null;
  amount: string | number;
  method: "CASH" | "BKASH" | "NAGAD" | "BANK" | "OTHER";
  transactionId?: string | null;
  senderNumber?: string | null;
  note?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  collectedBy: string;
  studentCourse?: { course: TCourse } | null;
};

export type TAttendance = {
  id: string;
  studentId: string;
  date: string;
  checkInAt: string;
  method: "NFC" | "MANUAL" | "ADMIN";
  deviceId?: string | null;
};

export type TAttendanceWithStudent = TAttendance & {
  student: TStudent;
};

export type TStudentCredentials = {
  studentId: string;
  initialPassword: string;
};

export type TAdmitStudentPayload = {
  name: string;
  nickname?: string;
  college?: string;
  mobile: string;
  bloodGroup: TBloodGroup;
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName: string;
  motherOccupation: string;
  motherMobile: string;
  addressVillage: string;
  addressPostOffice: string;
  addressUpozila: string;
  addressDistrict: string;
  sscInstitute: string;
  sscBoard: TEducationBoard;
  sscPassingYear: number;
  sscGpa: number;
  courseId: string;
  batchDayId: string;
  batchTime: TBatchTime;
};

export type TStudentQuery = {
  searchTerm?: string;
  hscBatch?: THscBatch;
  courseId?: string;
  batchDay?: TBatchDay;
  batchTime?: TBatchTime;
  district?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};