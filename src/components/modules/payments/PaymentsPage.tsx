"use client";
import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import {
  useGetAllPaymentsQuery,
  useGetDuePaymentsQuery,
} from "@/redux/features/payment/payment";
import { useGetStudentByIdQuery } from "@/redux/features/student/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dayjs from "dayjs";
import { formatPaymentMethodLabel } from "@/constants/labels";
import RecordPaymentModal, {
  type TCoursePaymentSummary,
} from "@/components/modules/payments/RecordPaymentModal";
import PaymentReceiptView from "@/components/modules/payments/PaymentReceiptView";
import PrintReceiptButton from "@/components/modules/payments/PrintReceiptButton";
import { printPaymentReceipt } from "@/utils/printReceipt";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import type { TPaymentRecord } from "@/types/payment";

type PayTarget = {
  studentId: string;
  preselect: TCoursePaymentSummary;
};

type ReceiptTarget = {
  payment: TPaymentRecord;
  studentName: string;
  studentId: string;
  studentMobile?: string;
  studentBatch?: string;
  paymentStatus?: "PAID" | "PARTIAL" | "PENDING";
  courseName?: string;
  fee?: number;
  previouslyPaid?: number;
};

const PaymentsPage = () => {
  const [page, setPage] = useState(1);
  // refetchOnMountOrArgChange forces a fresh fetch when the user switches tabs
  // or after a new payment is recorded (we still call refetch() explicitly below
  // so the page count and "All Payments" list update immediately).
  const {
    data,
    isLoading,
    refetch: refetchAll,
  } = useGetAllPaymentsQuery(
    { page, limit: 20 },
    { refetchOnMountOrArgChange: true },
  );
  const {
    data: dueData,
    refetch: refetchDue,
  } = useGetDuePaymentsQuery(undefined, { refetchOnMountOrArgChange: true });

  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  // Drives the receipt dialog. Set both when a payment is just recorded
  // (auto-open) and when the user clicks a row's Print action.
  const [receiptTarget, setReceiptTarget] =
    useState<ReceiptTarget | null>(null);
  // When the user clicks a row's printer icon we set the row's payment here
  // and trigger a `useGetStudentByIdQuery` (below) so we can build a full
  // receipt with mobile / batch / status / breakdown.
  const [rowPrintTarget, setRowPrintTarget] = useState<TPaymentRecord | null>(
    null,
  );
  const currentUser = useAppSelector(useCurrentUser);

  // Build a rich receipt from a payment + full student profile. Used by both
  // the row-print flow (after fetching the student) and the post-success flow
  // (after `onRecorded` fires with the student already loaded).
  const buildReceiptFromStudent = (
    payment: TPaymentRecord,
    student: NonNullable<typeof studentDetail>["data"] | null,
  ): ReceiptTarget | null => {
    if (!student) return null;

    const scId = payment.studentCourseId ?? undefined;
    const summary = (student.studentCourses ?? [])
      .filter((sc) => !sc.isCompleted)
      .map((sc) => {
        const paid = (student.payments ?? [])
          .filter((p) => p.studentCourseId === sc.id)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          studentCourseId: sc.id,
          courseName: sc.course?.name ?? "Course",
          fee: Number(sc.course?.fee ?? 0),
          paid,
        };
      })
      .find((s) => s.studentCourseId === scId);

    const batchLabel = (student.batches ?? [])
      .map((b) => `HSC ${String(b.hscBatch).replace(/^BATCH_/, "")}`)
      .join(", ");

    return {
      payment,
      studentName: student.user.name,
      studentId: student.user.studentId,
      studentMobile: student.mobile,
      studentBatch: batchLabel || undefined,
      paymentStatus: student.paymentStatus,
      courseName: summary?.courseName ?? payment.studentCourse?.course?.name,
      fee: summary?.fee,
      previouslyPaid: summary?.paid,
    };
  };

  // Minimal receipt built only from the payment row — used as a fallback when
  // the student profile can't be fetched (e.g. offline / 404). Missing fields
  // render as "—" on the receipt.
  const buildReceiptFromRow = (payment: TPaymentRecord): ReceiptTarget => ({
    payment,
    studentName: payment.student?.user?.name || "—",
    studentId: payment.student?.user?.studentId || "—",
    courseName: payment.studentCourse?.course?.name,
  });

  // Build the receipt for a payment that was just recorded (the modal already
  // loaded the student, so we always have the data).
  const buildReceiptFromRecorded = (
    payment: TPaymentRecord,
  ): ReceiptTarget | null =>
    buildReceiptFromStudent(payment, studentDetail?.data ?? null) ??
    buildReceiptFromRow(payment);

  // Lazy-load full student detail when "Pay" is clicked.
  const { data: studentDetail, isFetching: studentLoading } =
    useGetStudentByIdQuery(payTarget?.studentId || "", {
      skip: !payTarget,
    });

  // Row-print fetch: when the user clicks a row's printer icon we set
  // `rowPrintTarget` and trigger a second, independent fetch for that student
  // so we can build a receipt with mobile / batch / status / breakdown. The
  // effect below triggers `window.print()` once the data arrives.
  const { data: rowStudentData, isFetching: rowStudentLoading } =
    useGetStudentByIdQuery(rowPrintTarget?.studentId || "", {
      skip: !rowPrintTarget,
    });

  useEffect(() => {
    if (!rowPrintTarget) return;
    if (rowStudentLoading) return;
    const student = rowStudentData?.data ?? null;
    const target =
      buildReceiptFromStudent(rowPrintTarget, student) ??
      buildReceiptFromRow(rowPrintTarget);
    printPaymentReceipt({
      payment: target.payment,
      studentName: target.studentName,
      studentId: target.studentId,
      studentMobile: target.studentMobile,
      studentBatch: target.studentBatch,
      paymentStatus: target.paymentStatus,
      courseName: target.courseName,
      fee: target.fee,
      previouslyPaid: target.previouslyPaid,
      collectedByName: currentUser?.name,
      collectedByRole: currentUser?.role,
    });
    // Clear the target so a re-click of the same row's print button works.
    setRowPrintTarget(null);
  }, [rowPrintTarget, rowStudentData, rowStudentLoading, currentUser]);

  const handleOpenPay = (record: any) => {
    const preselect: TCoursePaymentSummary = {
      // The /payment/due endpoint returns the Course id under `courseId`, not the
      // StudentCourse id. The modal exposes a course selector that includes the
      // enrollment id, so we leave `studentCourseId` blank and prefill the amount.
      studentCourseId: "",
      courseName: record.courseName,
      fee: record.totalFee,
      paid: record.paid,
      due: record.due,
    };
    setPayTarget({ studentId: record.studentId, preselect });
  };

  const closePay = () => {
    setPayTarget(null);
  };

  const onPaymentRecorded = (payment: TPaymentRecord) => {
    // Auto-open the receipt dialog right after a successful payment so the
    // staff member can print and hand it to the student immediately.
    const target = buildReceiptFromRecorded(payment);
    if (target) setReceiptTarget(target);
  };

  const onPaymentSuccess = async () => {
    closePay();
    // After a new payment is recorded, jump back to page 1 so the new row is
    // visible, then refetch both lists.
    if (page !== 1) setPage(1);
    await Promise.all([refetchAll(), refetchDue()]);
  };

  // Row-level print action: trigger a fetch for the full student profile so
  // the printed receipt has mobile / batch / status / breakdown. The actual
  // print is dispatched by the effect above once the data lands.
  const handleRowPrint = (payment: TPaymentRecord) => {
    setRowPrintTarget(payment);
  };

  const closeReceipt = () => setReceiptTarget(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        <p className="text-sm text-muted-foreground">
          All payment records across the institute
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="due">Due Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Records ({data?.meta?.total || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                          No payments yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.student?.user?.name || "—"}</TableCell>
                          <TableCell className="font-semibold">৳{Number(p.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatPaymentMethodLabel(p.method)}</Badge>
                          </TableCell>
                          <TableCell>{p.studentCourse?.course?.name?.replace(/_/g, " ") || "—"}</TableCell>
                          <TableCell>
                            {p.paidAt ? dayjs(p.paidAt).format("MMM D, YYYY") : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <PrintReceiptButton
                              iconOnly
                              onPrint={() => handleRowPrint(p)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {data?.meta && data.meta.total > data.meta.limit && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {data.meta.page} of {Math.ceil(data.meta.total / data.meta.limit)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * data.meta.limit >= data.meta.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="due">
          <Card>
            <CardHeader>
              <CardTitle>Due Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {dueData?.data?.summary && (
                <div className="grid gap-3 md:grid-cols-2 mb-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Students with due</p>
                      <p className="text-2xl font-bold">{dueData.data.summary.totalDueStudents}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total due amount</p>
                      <p className="text-2xl font-bold">৳{dueData.data.summary.totalDueAmount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueData?.data?.records?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                          No dues — all payments completed!
                        </TableCell>
                      </TableRow>
                    ) : (
                      dueData?.data?.records?.map((r, i) => (
                        <TableRow key={`${r.studentId}-${r.courseId}-${i}`}>
                          <TableCell>
                            <div className="font-medium">{r.studentName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{r.studentUserId}</div>
                          </TableCell>
                          <TableCell>{r.courseName.replace(/_/g, " ")}</TableCell>
                          <TableCell>৳{r.totalFee.toLocaleString()}</TableCell>
                          <TableCell className="text-emerald-600">৳{r.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-destructive font-semibold">৳{r.due.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenPay(r)}
                            >
                              <Wallet className="h-4 w-4" /> Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {payTarget && studentDetail?.data && (
        <RecordPaymentModal
          open={!!payTarget}
          onClose={closePay}
          student={studentDetail.data}
          preselect={payTarget.preselect}
          onSuccess={onPaymentSuccess}
          onRecorded={onPaymentRecorded}
        />
      )}

      {payTarget && studentLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center text-white text-sm">
          Loading student…
        </div>
      )}

      {receiptTarget && (
        <PaymentReceiptView
          payment={receiptTarget.payment}
          studentName={receiptTarget.studentName}
          studentId={receiptTarget.studentId}
          studentMobile={receiptTarget.studentMobile}
          studentBatch={receiptTarget.studentBatch}
          paymentStatus={receiptTarget.paymentStatus}
          courseName={receiptTarget.courseName}
          fee={receiptTarget.fee}
          previouslyPaid={receiptTarget.previouslyPaid}
          collectedByName={currentUser?.name}
          collectedByRole={currentUser?.role}
          onBack={closeReceipt}
        />
      )}
    </div>
  );
};

export default PaymentsPage;