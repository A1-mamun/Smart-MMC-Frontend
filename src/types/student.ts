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
  // Per-enrollment Student ID (e.g. "271200" — HSC batch 27, year 1,
  // roll 200). Distinct from the user's permanent login identifier;
  // a student enrolled in two courses gets two IDs here.
  studentCourseId?: string | null;
  course: TCourse;
};

export type TStudentBatch = {
  id: string;
  batchDay: TBatchDay;
  batchTime: TBatchTime;
  hscBatch: THscBatch;
  /**
   * The BatchDay row this StudentBatch points at. Carries the canonical
   * `days[]` (weekday names) and `times[]` (freeform time strings) for
   * the parent course. May be null if the underlying BatchDay was hard-
   * deleted — `student.batches` then degrades to showing just the
   * legacy `batchDay` string + `batchTime`.
   */
  batchDayRel?: TCourseBatchDay | null;
};

export type TPaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';

export type TCoursePaymentStatus = {
  studentCourseId: string;
  courseName: string;
  status: TPaymentStatus;
};

export type TStudent = {
  id: string;
  college?: string | null;
  mobile: string;
  // Nullable since the admit form lets the admin skip these when info
  // isn't available at admit time.
  bloodGroup?: TBloodGroup | null;
  paymentStatus?: TPaymentStatus;
  paymentSummary?: {
    totalFee: number;
    totalPaid: number;
    totalDue: number;
  };
  coursePaymentStatuses?: TCoursePaymentStatus[];
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName?: string | null;
  motherOccupation?: string | null;
  motherMobile?: string | null;
  addressVillage?: string | null;
  addressPostOffice?: string | null;
  addressUpozila: string;
  addressDistrict: string;
  sscInstitute: string;
  sscBoard?: TEducationBoard | null;
  sscPassingYear?: number | null;
  sscGpa?: string | number | null;
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
  // Admin-set batch-graduation flag. A student cannot enroll in another
  // course while they have an active enrollment in a course whose
  // isCompleted is false. Distinct from StudentCourse.isCompleted
  // (which tracks per-enrollment course-grade completion).
  isCompleted?: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  // Per-course seat cap. NULL = uncapped. The backend enforces this
  // inside the admit/re-enroll transaction (with a SELECT … FOR UPDATE
  // on the course row), so concurrent admits can't slip past the cap.
  // Admins edit the value from the Courses page.
  //
  // SEMANTICS: this number is the cap PER (batchDay, batchTime) slot,
  // not per course. A course with 2 batchDays × 2 times[] = 4 slots
  // gets cap = totalSeats on each slot (effectively 4 × totalSeats
  // total seats across the course). The admit-form picker uses the
  // `GET /course/:id/seats` endpoint to surface per-slot fullness.
  totalSeats?: number | null;
  // Populated by Prisma's `_count` on the course include. Counts
  // StudentCourse rows linked to this course (including soft-deleted).
  // NOT authoritative for admission — the per-slot count returned by
  // `GET /course/:id/seats` is. Kept on the type for backward
  // compatibility with existing call sites; new seat-cap UX should
  // use `TCourseSeats` from that endpoint instead.
  _count?: { studentCourses?: number };
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

/**
 * Per-slot seat-cap read-out returned by `GET /course/:id/seats`.
 *
 * `enrolled` is the live count of `StudentBatch` rows for the slot
 * (i.e. how many students are currently occupying it). Slots that
 * have never been used are simply absent from the `slots` array —
 * the picker renders them with `enrolled = 0` via the Map.get
 * fallback.
 */
export type TCourseSlotSeats = {
  batchDayId: string;
  batchTime: string;
  enrolled: number;
};

/**
 * Response shape for the per-slot seat-cap endpoint. `totalSeats`
 * mirrors `Course.totalSeats` (NULL = uncapped); `slots` lists each
 * (batchDay, batchTime) that has at least one enrolled student.
 */
export type TCourseSeats = {
  totalSeats: number | null;
  slots: TCourseSlotSeats[];
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
  // When the row is a make-up swap (the recorded `date` is the
  // student's dedicated class day but they actually scanned on a
  // peer batch's day), this carries the actual scan date. Null for
  // normal attendance.
  swapFromDate?: string | null;
};

export type TAttendanceWithStudent = TAttendance & {
  student: TStudent;
};

export type TStudentCredentials = {
  studentId: string;
  initialPassword: string | null;
  // When an admin re-admits an existing student into another course,
  // the backend reuses the User/Student profile (no new login creds)
  // and stamps a fresh `studentCourseId` on the new enrollment.
  // The form shows the new per-enrollment ID and a "no password needed"
  // message in that case.
  studentCourseId?: string;
  alreadyEnrolled?: boolean;
};

export type TAdmitStudentPayload = {
  name: string;
  nickname?: string;
  college?: string;
  mobile: string;
  // Optional in the admit payload — admin can skip when info isn't on file.
  bloodGroup?: TBloodGroup | null;
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName?: string | null;
  motherOccupation?: string | null;
  motherMobile?: string | null;
  addressVillage?: string | null;
  addressPostOffice?: string | null;
  addressUpozila: string;
  addressDistrict: string;
  sscInstitute: string;
  sscBoard?: TEducationBoard | null;
  sscPassingYear?: number | null;
  sscGpa?: number | null;
  courseId: string;
  batchDayId: string;
  batchTime: TBatchTime;
};

/**
 * Narrow payload for enrolling an EXISTING student (matched by mobile)
 * into a NEW course via `POST /student/enroll-existing`. Strict subset
 * of `TAdmitStudentPayload` — the personal / guardian / address / SSC
 * blocks are intentionally omitted because the existing profile is
 * reused verbatim.
 */
export type TEnrollExistingStudentPayload = {
  mobile: string;
  courseId: string;
  batchDayId: string;
  batchTime: TBatchTime;
  // Optional — admins occasionally want to correct a nickname without
  // going through the full student-edit flow.
  nickname?: string;
};

export type TStudentQuery = {
  searchTerm?: string;
  hscBatch?: THscBatch;
  courseId?: string;
  batchDay?: TBatchDay;
  batchDayId?: string;
  batchTime?: TBatchTime;
  district?: string;
  // SMS scenario filters (additive with the rest). See
  // student.service.ts in the backend for the matching logic.
  /** ISO yyyy-mm-dd. Resolved server-side to weekday name and matched
   *  against BatchDay.days[]. */
  classDate?: string;
  /** Exact match against BatchDay.times[]. */
  classTime?: string;
  /** CSV of course UUIDs — picks every student enrolled in any of them. */
  scenarioCourses?: string;
  /** When true, keeps only students with at least one non-PAID enrollment. */
  hasDue?: boolean;
  /** When true, keeps only students enrolled in an active course. */
  activeCoursesOnly?: boolean;
  /**
   * ISO yyyy-mm-dd. Resolves to "students enrolled in a class on this
   * weekday minus students with an Attendance row on this exact date".
   * Used by the absent-warning SMS picker on /dashboard/sms.
   */
  absentOnDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};