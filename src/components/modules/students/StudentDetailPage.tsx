"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { useGetStudentByIdQuery, useDeleteStudentMutation } from "@/redux/features/student/student";
import { useGetStudentPaymentsQuery } from "@/redux/features/payment/payment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import RecordPaymentModal from "@/components/modules/payments/RecordPaymentModal";
import PaymentReceiptView from "@/components/modules/payments/PaymentReceiptView";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatBatchLabel,
  formatBatchDayLabel,
  formatBatchTimeLabel,
  formatBloodGroupLabel,
  formatBoardLabel,
  formatCourseLabel,
  formatPaymentMethodLabel,
} from "@/constants/labels";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import type { TPaymentRecord } from "@/types/payment";

type Props = { params: Promise<{ id: string }> };

const StudentDetailPage = ({ params }: Props) => {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, refetch } = useGetStudentByIdQuery(id);
  const { data: paymentData, refetch: refetchPayments } = useGetStudentPaymentsQuery(id);
  const [deleteStudent] = useDeleteStudentMutation();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<TPaymentRecord | null>(null);
  const currentUser = useAppSelector(useCurrentUser);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data?.data) {
    return <p className="text-muted-foreground">Student not found.</p>;
  }

  const student = data.data;
  const summary = paymentData?.data?.summary || [];
  const payments = paymentData?.data?.payments || [];

  const handleDelete = async () => {
    if (!confirm("Soft-delete this student? This can be reversed by an admin.")) return;
    try {
      await deleteStudent({ id, hard: false }).unwrap();
      toast.success("Student deleted");
      router.push("/dashboard/students");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{student.user.name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{student.user.studentId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPaymentOpen(true)}>
            <Wallet className="h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/students/${id}/edit`)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Mobile:</span> {student.mobile}</p>
            <p><span className="text-muted-foreground">Blood:</span> {formatBloodGroupLabel(student.bloodGroup)}</p>
            <p><span className="text-muted-foreground">College:</span> {student.college || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guardian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Father:</span> {student.fatherName} ({student.fatherOccupation})</p>
            <p className="pl-12 text-xs">{student.fatherMobile}</p>
            <p><span className="text-muted-foreground">Mother:</span> {student.motherName} ({student.motherOccupation})</p>
            <p className="pl-12 text-xs">{student.motherMobile}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SSC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Institute:</span> {student.sscInstitute}</p>
            <p><span className="text-muted-foreground">Board:</span> {formatBoardLabel(student.sscBoard)}</p>
            <p><span className="text-muted-foreground">Year:</span> {student.sscPassingYear}</p>
            <p><span className="text-muted-foreground">GPA:</span> {Number(student.sscGpa).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>{student.addressVillage}, {student.addressPostOffice}, {student.addressUpozila}, {student.addressDistrict}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses & Batches</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="courses" className="space-y-3">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.studentCourses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                      No courses
                    </TableCell>
                  </TableRow>
                ) : (
                  student.studentCourses?.map((sc) => (
                    <TableRow key={sc.id}>
                      <TableCell>{formatCourseLabel(sc.course.name)}</TableCell>
                      <TableCell>
                        {sc.isCompleted ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {student.batches && student.batches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {student.batches.map((b) => (
                <Badge key={b.id} variant="outline">
                  {formatBatchLabel(b.hscBatch)} • {formatBatchDayLabel(b.batchDay)} • {formatBatchTimeLabel(b.batchTime)}
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="payments" className="space-y-3">
          {summary.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {summary.map((s) => (
                <Card key={s.courseId}>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">{formatCourseLabel(s.courseName as any)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Fee: ৳{s.fee}</p>
                    <p className="text-xs text-muted-foreground">Paid: ৳{s.paid}</p>
                    <p className={`text-sm font-semibold mt-1 ${s.due > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      Due: ৳{s.due}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No payments yet
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>৳{Number(p.amount)}</TableCell>
                      <TableCell>{formatPaymentMethodLabel(p.method)}</TableCell>
                      <TableCell>{p.note || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="attendance">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.attendance?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      No attendance records
                    </TableCell>
                  </TableRow>
                ) : (
                  student.attendance?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(a.checkInAt).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.method}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <RecordPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        student={student}
        onSuccess={() => {
          refetch();
          refetchPayments();
        }}
        onRecorded={(p) => setRecordedPayment(p)}
      />

      {recordedPayment && (
        <PaymentReceiptView
          payment={recordedPayment}
          studentName={student.user.name}
          studentId={student.user.studentId}
          studentMobile={student.mobile}
          studentBatch={(student.batches ?? [])
            .map((b) => `HSC ${String(b.hscBatch).replace(/^BATCH_/, "")}`)
            .join(", ") || undefined}
          paymentStatus={student.paymentStatus}
          courseName={
            student.studentCourses?.find(
              (sc) => sc.id === recordedPayment.studentCourseId,
            )?.course?.name
          }
          collectedByName={currentUser?.name}
          collectedByRole={currentUser?.role}
          onBack={() => setRecordedPayment(null)}
        />
      )}

      <div className="hidden">
        <button onClick={() => refetch()}>refresh</button>
      </div>
    </div>
  );
};

export default StudentDetailPage;