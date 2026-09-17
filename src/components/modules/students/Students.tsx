"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X, Filter, MessageSquare, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TStudent, TStudentQuery, TCourseBatchDay } from "@/types/student";
import { TPaginationMeta } from "@/types/common";
import {
  useGetCourseByIdQuery,
  useGetAllCoursesQuery,
} from "@/redux/features/course/course";
import StudentsTable from "./StudentsTable";
import RecordPaymentModal from "@/components/modules/payments/RecordPaymentModal";
import PaymentReceiptView from "@/components/modules/payments/PaymentReceiptView";
import SmsComposer from "@/components/modules/sms/SmsComposer";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import type { TPaymentRecord } from "@/types/payment";
import type { TSmsRecipient } from "@/types/sms";

type StudentsProps = {
  studentsData: TStudent[];
  meta?: TPaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  query: TStudentQuery;
  onQueryChange: (q: TStudentQuery) => void;
  refetch: () => void;
};

const SEARCH_DEBOUNCE_MS = 350;

const Students = ({
  studentsData,
  meta,
  isLoading,
  isFetching,
  query,
  onQueryChange,
  refetch,
}: StudentsProps) => {
  const router = useRouter();
  const [search, setSearch] = useState(query.searchTerm || "");
  const [payingStudent, setPayingStudent] = useState<TStudent | null>(null);
  // Drives the full-page receipt overlay shown right after a successful payment.
  const [recordedPayment, setRecordedPayment] = useState<TPaymentRecord | null>(null);
  // When the user clicks the per-row MessageSquare action we open the SMS
  // composer in a Dialog, pre-filled with that single recipient. They can
  // still type any number of additional recipients before sending.
  const [smsRecipient, setSmsRecipient] = useState<TSmsRecipient | null>(null);
  const currentUser = useAppSelector(useCurrentUser);

  // Local state for the cascading filter.
  const [courseId, setCourseId] = useState<string>(query.courseId || "");
  // const [hscBatch, setHscBatch] = useState<string>(query.hscBatch || "");
  const [batchDayId, setBatchDayId] = useState<string>(query.batchDayId || "");
  const [batchTime, setBatchTime] = useState<string>(query.batchTime || "");
  console.log("batch day id", batchDayId, "batch time", batchTime);

  // Fetch active courses for the course dropdown.
  const { data: coursesData } = useGetAllCoursesQuery(
    { isActive: true, limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];

  // Fetch the selected course detail so we know its batch days.
  const { data: courseDetail } = useGetCourseByIdQuery(courseId, {
    skip: !courseId,
  });

  // Batch day options: each BatchDay row of the course (by its name).
  // When no course is selected we return [] explicitly so the Batch Day
  // select goes back to its disabled "Pick a course first" state — even if
  // courseDetail is still returning previously-cached data from when a
  // course was selected.
  const availableBatchDays = useMemo(
    () =>
      !courseId
        ? []
        : (courseDetail?.data?.batchDays ?? []).map((d: TCourseBatchDay) => ({
            value: d.id,
            label: d.name || `Batch ${d.position + 1}`,
          })),
    [courseDetail, courseId],
  );

  // Time options: the chosen batch day's `times[]`.
  const availableTimes = useMemo(() => {
    if (!batchDayId) return [];
    const found = (courseDetail?.data?.batchDays ?? []).find(
      (d: TCourseBatchDay) => d.id === batchDayId,
    );
    return found?.times || [];
  }, [batchDayId, courseDetail]);

  // Search-as-you-type debounce.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = search.trim() || undefined;
      if ((query.searchTerm || undefined) === next) return;
      onQueryChange({ ...query, searchTerm: next, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    onQueryChange({ ...query, searchTerm: undefined, page: 1 });
  };

  const clearAllFilters = () => {
    setCourseId("");
    setBatchDayId("");
    setBatchTime("");
    onQueryChange({
      ...query,
      courseId: undefined,
      hscBatch: undefined,
      batchDay: undefined,
      batchDayId: undefined,
      batchTime: undefined,
      // Reset to the page default (active-courses-only = true).
      activeCoursesOnly: true,
      page: 1,
    });
  };

  const hasActiveFilter =
    !!search ||
    !!courseId ||
    !!batchDayId ||
    !!batchTime ||
    !!query.activeCoursesOnly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total students` : "Loading..."}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/students/new">
            <Plus className="h-4 w-4" /> Admit Student
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, student ID, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onQueryChange({
                  ...query,
                  searchTerm: search.trim() || undefined,
                  page: 1,
                });
              }
            }}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="rounded-md border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Cascading filters</span>
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="ml-auto h-7"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* 1. Course */}
            <div className="space-y-1">
              <Label>1. Course</Label>
              <Select
                value={courseId || "_all"}
                onValueChange={(v) => {
                  const next = v === "_all" ? "" : v;
                  setCourseId(next);
                  setBatchDayId("");
                  setBatchTime("");
                  onQueryChange({
                    ...query,
                    courseId: next || undefined,
                    hscBatch: undefined,
                    batchDay: undefined,
                    batchDayId: undefined,
                    batchTime: undefined,
                    page: 1,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatCourseName(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Batch Day (by its group name) */}
            <div className="space-y-1">
              <Label>2. Batch Day</Label>
              <Select
                value={batchDayId || "_all"}
                onValueChange={(v) => {
                  const next = v === "_all" ? "" : v;
                  setBatchDayId(next);
                  setBatchTime("");
                  onQueryChange({
                    ...query,
                    batchDay: undefined,
                    batchDayId: next || undefined,
                    batchTime: undefined,
                    page: 1,
                  });
                }}
                disabled={availableBatchDays.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableBatchDays.length === 0
                        ? "Pick a course first"
                        : "Select batch day"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All batch days</SelectItem>
                  {availableBatchDays.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Time (from the selected batch day's times[]) */}
            <div className="space-y-1">
              <Label>3. Time</Label>
              <Select
                value={batchTime || "_all"}
                onValueChange={(v) => {
                  const next = v === "_all" ? "" : v;
                  setBatchTime(next);
                  onQueryChange({
                    ...query,
                    batchTime: next || undefined,
                    page: 1,
                  });
                }}
                disabled={availableTimes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableTimes.length === 0
                        ? "Pick a batch day first"
                        : "Select time"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All times</SelectItem>
                  {availableTimes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableTimes.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Defined under the selected batch day
                </p>
              )}
            </div>
          </div>

          {/* 4. Active courses only (defaults to on so students whose only
              enrollments are in archived / inactive courses are hidden by
              default; users who want the full roster can toggle this off). */}
          <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium leading-none">
                  Active courses only
                </p>
                <p className="text-xs text-muted-foreground">
                  Skip inactive / archived
                </p>
              </div>
            </div>
            <Switch
              checked={!!query.activeCoursesOnly}
              onCheckedChange={(v) =>
                onQueryChange({
                  ...query,
                  activeCoursesOnly: v || undefined,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      </div>

      <StudentsTable
        students={studentsData}
        isLoading={isLoading}
        isFetching={isFetching}
        onView={(s) => router.push(`/dashboard/students/${s.id}`)}
        onEdit={(s) => router.push(`/dashboard/students/${s.id}/edit`)}
        onPay={(s) => setPayingStudent(s)}
        onSendSms={(s) =>
          setSmsRecipient({
            studentId: s.id,
            name: s.user.name,
            mobile: s.mobile,
          })
        }
      />

      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() =>
              onQueryChange({ ...query, page: (meta.page || 1) - 1 })
            }
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page * meta.limit >= meta.total}
            onClick={() =>
              onQueryChange({ ...query, page: (meta.page || 1) + 1 })
            }
          >
            Next
          </Button>
        </div>
      )}

      {payingStudent && (
        <RecordPaymentModal
          open={!!payingStudent}
          onClose={() => setPayingStudent(null)}
          student={payingStudent}
          onSuccess={() => {
            setPayingStudent(null);
            toast.success("Payment recorded");
            refetch();
          }}
          onRecorded={(p) => setRecordedPayment(p)}
        />
      )}

      {recordedPayment && payingStudent && (
        <PaymentReceiptView
          payment={recordedPayment}
          studentName={payingStudent.user.name}
          studentId={payingStudent.user.studentId}
          studentMobile={payingStudent.mobile}
          studentBatch={(payingStudent.batches ?? [])
            .map((b) => `HSC ${String(b.hscBatch).replace(/^BATCH_/, "")}`)
            .join(", ") || undefined}
          paymentStatus={payingStudent.paymentStatus}
          courseName={
            payingStudent.studentCourses?.find(
              (sc) => sc.id === recordedPayment.studentCourseId,
            )?.course?.name
          }
          collectedByName={currentUser?.name}
          collectedByRole={currentUser?.role}
          onBack={() => setRecordedPayment(null)}
        />
      )}

      {smsRecipient && (
        <Dialog
          open={!!smsRecipient}
          onOpenChange={(o) => !o && setSmsRecipient(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Send SMS to {smsRecipient.name}
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs text-muted-foreground">
              {smsRecipient.mobile}
            </div>
            <SmsComposer
              recipients={[smsRecipient]}
              hideRecipientEditor
              onSent={() => setSmsRecipient(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const formatCourseName = (name: string) => {
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "HSC Final Preparation",
    ADMISSION: "Admission",
  };
  return map[name] || name;
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-muted-foreground">
    {children}
  </label>
);

export default Students;
