"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGetMyProfileQuery } from "@/redux/features/student/student";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { formatCourseLabel, formatPaymentMethodLabel } from "@/constants/labels";
import PrintReceiptButton from "@/components/modules/payments/PrintReceiptButton";
import { printPaymentReceipt } from "@/utils/printReceipt";
import dayjs from "dayjs";
import type { TPaymentRecord } from "@/types/payment";

const StudentPayments = () => {
  const { data, isLoading } = useGetMyProfileQuery(undefined);
  const currentUser = useAppSelector(useCurrentUser);

  if (isLoading || !data?.data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const payments = data.data.payments || [];
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  // Row-level print action: mount the receipt offscreen and open the system
  // print dialog immediately — no overlay, no navigation.
  const handleRowPrint = (payment: TPaymentRecord) => {
    // `data.data` is guaranteed non-null here because of the early return above,
    // but capture it in a local so closures stay narrowed.
    const student = data.data!;
    const batchLabel = (student.batches ?? [])
      .map((b) => `HSC ${String(b.hscBatch).replace(/^BATCH_/, "")}`)
      .join(", ");

    /*
     * Compute the receipt's status from the per-payment math, NOT from
     * `student.paymentStatus`. The profile snapshot represents the
     * student's overall enrollment status which can be stale (e.g. the
     * admin recorded a payment via the override → PAID, but a re-fetch
     * hasn't landed yet, OR an override was applied to a different
     * enrollment). The receipt is a historical document for THIS
     * specific payment, so its status must reflect fee-vs-paid for the
     * matching enrollment at the moment the payment was recorded.
     *
     * Concretely:
     *   fee         = the enrollment's course fee
     *   previouslyPaid = sum of all earlier payments for the same
     *                    enrollment (paid before this one)
     *   totalPaidRunning = previouslyPaid + this payment's amount
     *   paymentStatus =
     *     - PAID  iff totalPaidRunning >= fee AND fee > 0
     *     - PARTIAL iff 0 < totalPaidRunning < fee
     *     - PENDING otherwise
     *
     * Because we ignore override status here, the PAID seal will NOT
     * render for a partial-but-override-PAID payment — which is exactly
     * what the student-panel print flow needs. The post-record receipt
     * (the dialog right after the admin clicks Record Payment) is the
     * place where the override PAID seal belongs; a receipt printed
     * later should reflect the actual money math.
     */
    const scId = payment.studentCourseId;
    const enrollment = (student.studentCourses ?? []).find(
      (sc) => sc.id === scId,
    );
    const fee = enrollment ? Number(enrollment.course?.fee ?? 0) : undefined;
    const previouslyPaid = (student.payments ?? [])
      .filter(
        (p) =>
          p.studentCourseId === scId &&
          p.id !== payment.id &&
          // payments earlier in time than this one
          (!p.paidAt || !payment.paidAt
            ? true
            : new Date(p.paidAt).getTime() < new Date(payment.paidAt).getTime()),
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPaidRunning = previouslyPaid + Number(payment.amount);

    let derivedStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
    if (fee !== undefined && fee > 0) {
      if (totalPaidRunning >= fee) derivedStatus = "PAID";
      else if (totalPaidRunning > 0) derivedStatus = "PARTIAL";
    } else if (totalPaidRunning > 0) {
      derivedStatus = "PARTIAL";
    }

    printPaymentReceipt({
      payment,
      studentName: student.user?.name || "—",
      studentId: student.user?.studentId || "—",
      studentMobile: student.mobile,
      studentBatch: batchLabel || undefined,
      paymentStatus: derivedStatus,
      courseName: payment.studentCourse?.course?.name,
      fee,
      previouslyPaid,
      collectedByName: currentUser?.name,
      collectedByRole: currentUser?.role,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Payments</h2>
        <p className="text-sm text-muted-foreground">
          Total paid so far:{" "}
          <span className="font-semibold">৳{totalPaid.toLocaleString()}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.paidAt ? dayjs(p.paidAt).format("MMM D, YYYY") : "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ৳{Number(p.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatPaymentMethodLabel(p.method)}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.studentCourse?.course
                          ? formatCourseLabel(p.studentCourse.course.name)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <PrintReceiptButton
                          iconOnly
                          onPrint={() => handleRowPrint(p)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPayments;
