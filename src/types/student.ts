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
  // Mobile is the canonical per-account identifier now; the
  // per-enrollment `studentCourseId` lives on the
  // `TStudentCourseEnrollment` shape below.
  mobile: string;
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

/**
 * All-time attendance counts surfaced on the Students list and the
 * per-student attendance details page. `percentage` is rounded to
 * the nearest integer (matches the badge in the Students list);
 * clients that need more precision should re-compute from
 * `present / total * 100`.
 */
export type TAttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  percentage: number;
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
  /**
   * All-time attendance summary, computed server-side in
   * `student.service.ts → getAllStudentsFromDB` via a single
   * `attendance.groupBy` round-trip. The Students list renders
   * the `percentage` directly (rounded to the nearest integer)
   * and the per-status counts power the calendar details page.
   * Optional because the backend only attaches it on the list
   * endpoint — the per-student detail endpoint and the SMS picker
   * pass through `attendance: TAttendance[]` instead.
   */
  attendanceSummary?: TAttendanceSummary;
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

// Course lifecycle stages — drives the Courses page badge color and
// (in tandem with `isAllowAdmitAnotherCourse`) the admit-form picker.
// Kept as a string-literal union so the type stays usable in plain TS
// without importing from Prisma-generated enums.
export type TCourseStatus = 'ADMISSION' | 'ONGOING' | 'COMPLETE';

export type TCourse = {
  id: string;
  name: TCourseName;
  description?: string | null;
  fee: string | number;
  hscBatch: THscBatch;
  // Course lifecycle stage (ADMISSION / ONGOING / COMPLETE). New courses
  // default to ADMISSION. Admins flip stages via the segmented control
  // on the Courses page (single click, no edit modal). Independent of
  // `isAllowAdmitAnotherCourse` (the actual enrollment gate) — see below.
  status?: TCourseStatus;
  // Admin-controlled gate that overrides the natural
  // "one-course-at-a-time" rule: when true, the student-service
  // enrollment block lets a student with an active enrollment in THIS
  // course admit into another course. Defaults to false; the status-set
  // endpoint keeps it consistent with `status` (COMPLETE → true, anything
  // else → false) so admins can't drift them apart via single-click
  // transitions. Distinct from `StudentCourse.isCompleted` (which tracks
  // per-enrollment course-grade completion set by the exam module).
  isAllowAdmitAnotherCourse?: boolean;
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
  /**
   * Per-batch class duration in total minutes (e.g. 75 for "1h 15m").
   * Drives the kiosk's live progress bar / countdown. Optional on
   * input — `null` falls back to the legacy 60-min default until
   * the admin sets an explicit value.
   */
  durationMinutes?: number | null;
  /**
   * Per-slot admit-enabled flag, parallel to `times[]`. The admin
   * manually toggles which slot of a batch accepts attendance at
   * any given time. Default behaviour (when this array is empty
   * or shorter than `times`) treats every slot as admitting, so
   * legacy rows continue to work without a manual edit.
   */
  slotStates?: boolean[];
  /**
   * Per-slot "check-in window override" flag, parallel to
   * `times[]`. When the i-th element is `true`, the kiosk
   * accepts scans for that slot regardless of the wall clock
   * (admin opened the window early for an early arrival, or
   * kept it open past the 5-min mark). When `false` (or
   * absent), the kiosk uses the default 5-minute window
   * centred on the slot start time. Independent of the
   * admit gate (slotStates[i]).
   */
  manualWindowOverride?: boolean[];
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
  // Outcome for THIS row. Mirrors the backend `AttendanceStatus`
  // enum (see AttendanceStatusBadge.tsx). The migration backfilled
  // every pre-existing row to PRESENT, so historical responses
  // always carry a non-null value. Make-up attendance is no longer
  // supported — SWAP is intentionally absent from the union.
  status?: "PRESENT" | "ABSENT" | string;
  deviceId?: string | null;
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
  /**
   * Course lifecycle filter — narrows the cohort to students whose
   * active enrollment belongs to a course in the given stage.
   * Mirrors the Courses page tabs so the Students page can offer
   * the same Admission / Ongoing / Complete split. When `courseId`
   * is also set, both filters are AND-combined.
   */
  courseStatus?: TCourseStatus;
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
  /**
   * ISO yyyy-mm-dd. Resolves to "students enrolled in a class on this
   * weekday minus students with an Attendance row on this exact date".
   * Used by the absent-warning SMS picker on /dashboard/sms.
   */
  absentOnDate?: string;
  /**
   * Free-vs-paid segregation. `false` hides free-class accounts (paid
   * dashboard default); `true` shows only the marketer roster; `undefined`
   * returns everyone. Mirrors the backend `isFreeAccount` filter.
   */
  isFreeAccount?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};