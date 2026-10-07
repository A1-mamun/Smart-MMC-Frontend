"use client";
import {
  Eye,
  Edit,
  Loader2,
  Wallet,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import {
  TStudent,
  TStudentCourseEnrollment,
  TStudentBatch,
  TCourseStatus,
} from "@/types/student";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatBatchLabel,
  formatBatchDayLabel,
  formatBatchTimeLabel,
  formatCourseLabel,
} from "@/constants/labels";

type StudentsTableProps = {
  students: TStudent[];
  isLoading: boolean;
  isFetching: boolean;
  /**
   * When set, only the enrollments whose `course.status` matches this
   * value are rendered in the row (Student ID, Courses, Batch, Batch
   * Day, Batch Time cells, payment status / totals). The student row
   * itself stays visible — a student admitted to multiple courses
   * across different stages will still appear once on each tab,
   * scoped to the tab's cohort. When undefined, every active
   * enrollment is shown (backwards-compatible with callers that
   * don't pass a tab).
   */
  courseStatus?: TCourseStatus;
  onView: (s: TStudent) => void;
  onEdit: (s: TStudent) => void;
  onPay?: (s: TStudent) => void;
  /**
   * Optional handler invoked when the user clicks the per-row "Send SMS"
   * action. When provided a MessageSquare icon button is rendered on every
   * row. When omitted the action is hidden entirely (the dashboard-wide
   * SMS page still works regardless).
   */
  onSendSms?: (s: TStudent) => void;
};

const computeTotals = (student: TStudent) => {
  const enrollments = student.studentCourses ?? [];
  const totalFee = enrollments.reduce(
    (sum, sc) => sum + Number(sc.course?.fee ?? 0),
    0,
  );
  const totalPaid = (student.payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const totalDue = Math.max(0, totalFee - totalPaid);
  return { totalFee, totalPaid, totalDue };
};

/**
 * Pair a StudentCourse enrollment to the StudentBatch that actually serves
 * that course. The backend now exposes `batchDayRel.courseId` on every
 * StudentBatch (carried by the parent course's BatchDay), so the match is
 * exact rather than order-based.
 *
 * Falls back to the first batch on the student when (a) only one batch is
 * present (the historical single-course shape), or (b) no batch carries a
 * `batchDayRel` (legacy rows from before the relation shipped). The fallback
 * keeps the existing single-row visual for students who only ever enrolled
 * in one course.
 */
const findBatchForEnrollment = (
  enrollment: TStudentCourseEnrollment,
  batches: TStudentBatch[] | null | undefined,
): TStudentBatch | undefined => {
  if (!batches || batches.length === 0) return undefined;
  const matched = batches.find(
    (b) => b.batchDayRel?.courseId === enrollment.courseId,
  );
  if (matched) return matched;
  return batches.length === 1 ? batches[0] : undefined;
};

/**
 * Per-enrollment vertical separator used between stacked blocks in the
 * Student ID / Courses / Batch / Batch Day / Batch Time cells when a
 * student has more than one active course. The single-course path
 * renders without dividers so the cell reads identically to the
 * pre-change layout.
 */
const EnrollmentDivider = () => (
  <div
    aria-hidden
    className="my-1 h-px w-full bg-border/60 last:hidden"
  />
);

const StudentsTable = ({
  students,
  isLoading,
  isFetching,
  courseStatus,
  onView,
  onEdit,
  onPay,
  onSendSms,
}: StudentsTableProps) => {
  return (
    <div className="rounded-md border bg-card relative">
      {isFetching && !isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Courses</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Batch Day</TableHead>
            <TableHead>Batch Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                Loading students...
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                No students found.
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => {
              // When a course-status tab is active, scope the per-row
              // render to the enrollments whose course is in that
              // stage. The student row still appears (they're enrolled
              // in at least one matching course — the backend already
              // filtered on the same criterion via ?courseStatus=X),
              // but every per-enrollment column (Student ID, Courses,
              // Batch, Batch Day, Batch Time) and the payment totals
              // only consider the matching slice so a student admitted
              // to two courses across different stages doesn't show
              // BOTH enrollments when the admin is on the ADMISSION
              // tab.
              const allEnrollments = student.studentCourses ?? [];
              const enrollments = courseStatus
                ? allEnrollments.filter(
                    (sc) => (sc.course?.status ?? "ADMISSION") === courseStatus,
                  )
                : allEnrollments;
              // Recompute the totals against the filtered slice so the
              // status badge, balance, and Pay-button gating reflect
              // just the courses that are visible on the current tab.
              const filteredTotalFee = enrollments.reduce(
                (sum, sc) => sum + Number(sc.course?.fee ?? 0),
                0,
              );
              const filteredTotalPaid = (student.payments ?? [])
                // Scope the payment slice to the visible enrollments
                // too — otherwise a student with a PAID HSC_2ND_YEAR
                // (in a different status tab) would still drag the
                // totals into "PAID" on the ADMISSION tab.
                .filter((p) =>
                  enrollments.some((sc) => sc.id === p.studentCourseId),
                )
                .reduce((sum, p) => sum + Number(p.amount), 0);
              const totalFee = filteredTotalFee;
              const totalPaid = filteredTotalPaid;
              const totalDue = Math.max(0, totalFee - totalPaid);
              const hasEnrollments = enrollments.length > 0;
              const isFullyPaid = hasEnrollments && totalDue <= 0;
              const isPartial =
                hasEnrollments && totalPaid > 0 && totalDue > 0;
              const isPending = hasEnrollments && totalPaid <= 0;
              // When a course-status tab is active, derive the per-row
              // status from the filtered slice (totalFee / totalPaid
              // above are already scoped). Otherwise fall back to the
              // student-level snapshot the backend ships.
              const status = courseStatus
                ? isFullyPaid
                  ? "PAID"
                  : isPartial
                  ? "PARTIAL"
                  : isPending
                  ? "PENDING"
                  : "PENDING"
                : student.paymentStatus ??
                  (isFullyPaid
                    ? "PAID"
                    : isPartial
                    ? "PARTIAL"
                    : isPending
                    ? "PENDING"
                    : "PENDING");

              // Only show the Pay button when the student actually owes money.
              // We respect the persisted `paymentStatus` (which honors manual
              // status overrides on record-payment) so a student overridden
              // to PAID doesn't get a Pay button even if amount math still
              // shows a due. Falls back to `totalDue > 0` only when the
              // backend didn't provide a status.
              const isFullyPaidByStatus = status === "PAID";
              const hasDue = !isFullyPaidByStatus && totalDue > 0;

              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-medium">{student.user.name}</div>
                    {student.user.nickname && (
                      <div className="text-xs text-muted-foreground">
                        &ldquo;{student.user.nickname}&rdquo;
                      </div>
                    )}
                  </TableCell>

                  {/* Student ID — one row per enrollment (per-enrollment
                       studentCourseId), with a fallback to the user-level
                       login ID when no enrollments exist. */}
                  <TableCell className="font-mono text-xs align-top">
                    {hasEnrollments ? (
                      <div className="space-y-1">
                        {enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex flex-col leading-tight"
                          >
                            <span className="font-semibold">
                              {enrollment.studentCourseId || (
                                <span className="text-muted-foreground font-normal italic">
                                  not assigned
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatCourseLabel(enrollment.course?.name)}
                            </span>
                            <EnrollmentDivider />
                          </div>
                        ))}
                      </div>
                    ) : (
                      // No active enrollment — fall back to the user's
                      // mobile (the dropped `User.studentId` was
                      // replaced by mobile as the per-account
                      // identifier).
                      <span>{student.user.mobile}</span>
                    )}
                  </TableCell>

                  <TableCell className="align-top">
                    {student.mobile}
                  </TableCell>

                  {/* Courses — stacked badges, one per enrollment. Falls
                       back to "No enrollment" when the student has none. */}
                  <TableCell className="align-top">
                    {hasEnrollments ? (
                      <div className="space-y-1">
                        {enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex flex-wrap items-center gap-1"
                          >
                            <Badge variant="secondary" className="text-xs">
                              {formatCourseLabel(enrollment.course?.name)}
                            </Badge>
                            {enrollment.isCompleted && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-emerald-500 text-emerald-700"
                              >
                                Completed
                              </Badge>
                            )}
                            <EnrollmentDivider />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No enrollment
                      </span>
                    )}
                  </TableCell>

                  {/* Batch — paired to the matching enrollment via
                       batchDayRel.courseId. Falls back to the enrollment's
                       course hscBatch when no matching batch exists. */}
                  <TableCell className="align-top">
                    {hasEnrollments ? (
                      <div className="space-y-1">
                        {enrollments.map((enrollment) => {
                          const batch = findBatchForEnrollment(
                            enrollment,
                            student.batches,
                          );
                          const fallback = formatBatchLabel(
                            enrollment.course?.hscBatch,
                          );
                          return (
                            <div
                              key={enrollment.id}
                              className="flex flex-col leading-tight"
                            >
                              <Badge variant="outline" className="self-start">
                                {batch
                                  ? formatBatchLabel(batch.hscBatch)
                                  : fallback}
                              </Badge>
                              <EnrollmentDivider />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Batch Day — the student's ENROLLED weekday. The
                       StudentBatch.batchDay field carries a single
                       weekday name (the one picked from the parent
                       BatchDay's days[] catalog at admit time), so we
                       show it verbatim. No catalog fallback: a student
                       can only ever be enrolled in one day per course. */}
                  <TableCell className="align-top">
                    {hasEnrollments ? (
                      <div className="space-y-1">
                        {enrollments.map((enrollment) => {
                          const batch = findBatchForEnrollment(
                            enrollment,
                            student.batches,
                          );
                          const dayLabel = batch
                            ? formatBatchDayLabel(batch.batchDay)
                            : "—";
                          return (
                            <div
                              key={enrollment.id}
                              className="text-xs leading-snug"
                            >
                              {dayLabel}
                              <EnrollmentDivider />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Batch Time — the student's ENROLLED class slot.
                       StudentBatch.batchTime is the single slot chosen
                       from the parent BatchDay's times[] catalog, so we
                       render it directly. */}
                  <TableCell className="align-top">
                    {hasEnrollments ? (
                      <div className="space-y-1">
                        {enrollments.map((enrollment) => {
                          const batch = findBatchForEnrollment(
                            enrollment,
                            student.batches,
                          );
                          const timeLabel = batch
                            ? formatBatchTimeLabel(batch.batchTime)
                            : "—";
                          return (
                            <div
                              key={enrollment.id}
                              className="text-xs leading-snug"
                            >
                              {timeLabel}
                              <EnrollmentDivider />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  <TableCell className="align-top">
                    {!hasEnrollments ? (
                      <span className="text-xs text-muted-foreground">
                        No enrollment
                      </span>
                    ) : status === "PAID" ? (
                      <div className="space-y-0.5">
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          ৳{totalPaid.toLocaleString()} / ৳
                          {totalFee.toLocaleString()}
                        </div>
                      </div>
                    ) : status === "PARTIAL" ? (
                      <div className="space-y-0.5">
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500 text-amber-700 dark:text-amber-400"
                        >
                          Partial
                        </Badge>
                        <div className="text-xs">
                          <span className="text-emerald-600">
                            Paid ৳{totalPaid.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-destructive font-medium">
                            Due ৳{totalDue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <Badge
                          variant="outline"
                          className="gap-1 border-destructive text-destructive"
                        >
                          Pending
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Due ৳{totalDue.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <div className="flex justify-end gap-1">
                      {hasDue && onPay && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8"
                          onClick={() => onPay(student)}
                          title="Record Payment"
                        >
                          <Wallet className="h-4 w-4" /> Pay
                        </Button>
                      )}
                      {onSendSms && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSendSms(student)}
                          title="Send SMS"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(student)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(student)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentsTable;
