"use client";
import { Eye, Edit, Loader2, Wallet, CheckCircle2 } from "lucide-react";
import { TStudent } from "@/types/student";
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
import { formatBatchLabel, formatBatchDayLabel, formatBatchTimeLabel } from "@/constants/labels";

type StudentsTableProps = {
  students: TStudent[];
  isLoading: boolean;
  isFetching: boolean;
  onView: (s: TStudent) => void;
  onEdit: (s: TStudent) => void;
  onPay?: (s: TStudent) => void;
};

const computeTotals = (student: TStudent) => {
  const enrollments = student.studentCourses ?? [];
  const totalFee = enrollments.reduce((sum, sc) => sum + Number(sc.course?.fee ?? 0), 0);
  const totalPaid = (student.payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const totalDue = Math.max(0, totalFee - totalPaid);
  return { totalFee, totalPaid, totalDue };
};

const StudentsTable = ({
  students,
  isLoading,
  isFetching,
  onView,
  onEdit,
  onPay,
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
            <TableHead>Batch</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Courses</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                Loading students...
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No students found.
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => {
              const batch = student.batches?.[0];
              const { totalFee, totalPaid, totalDue } = computeTotals(student);
              const hasEnrollments = (student.studentCourses?.length ?? 0) > 0;
              const isFullyPaid = hasEnrollments && totalDue <= 0;
              const isPartial =
                hasEnrollments && totalPaid > 0 && totalDue > 0;
              const isPending = hasEnrollments && totalPaid <= 0;
              const hasDue = totalDue > 0;
              const status =
                student.paymentStatus ??
                (isFullyPaid
                  ? "PAID"
                  : isPartial
                  ? "PARTIAL"
                  : isPending
                  ? "PENDING"
                  : "PENDING");

              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-medium">{student.user.name}</div>
                    {student.user.nickname && (
                      <div className="text-xs text-muted-foreground">
                        "{student.user.nickname}"
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{student.user.studentId}</TableCell>
                  <TableCell>{student.mobile}</TableCell>
                  <TableCell>
                    {batch ? (
                      <div className="space-y-1">
                        <Badge variant="outline">{formatBatchLabel(batch.hscBatch)}</Badge>
                        <div className="text-xs text-muted-foreground">
                          {formatBatchDayLabel(batch.batchDay)}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{batch ? formatBatchTimeLabel(batch.batchTime) : "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.studentCourses?.map((sc) => (
                        <Badge key={sc.id} variant="secondary" className="text-xs">
                          {sc.course.name.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!hasEnrollments ? (
                      <span className="text-xs text-muted-foreground">No enrollment</span>
                    ) : status === "PAID" ? (
                      <div className="space-y-0.5">
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          ৳{totalPaid.toLocaleString()} / ৳{totalFee.toLocaleString()}
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
                  <TableCell className="text-right">
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