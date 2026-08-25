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
import { formatCourseLabel, formatPaymentMethodLabel } from "@/constants/labels";
import dayjs from "dayjs";

const StudentPayments = () => {
  const { data, isLoading } = useGetMyProfileQuery(undefined);

  if (isLoading || !data?.data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const payments = data.data.payments || [];
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

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