"use client";
import { useState } from "react";
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

type PayTarget = {
  studentId: string;
  preselect: TCoursePaymentSummary;
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

  // Lazy-load full student detail when "Pay" is clicked.
  const { data: studentDetail, isFetching: studentLoading } =
    useGetStudentByIdQuery(payTarget?.studentId || "", {
      skip: !payTarget,
    });

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

  const onPaymentSuccess = async () => {
    closePay();
    // After a new payment is recorded, jump back to page 1 so the new row is
    // visible, then refetch both lists.
    if (page !== 1) setPage(1);
    await Promise.all([refetchAll(), refetchDue()]);
  };

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
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
        />
      )}

      {payTarget && studentLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center text-white text-sm">
          Loading student…
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;