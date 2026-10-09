"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useGetStudentByIdQuery } from "@/redux/features/student/student";
import {
  useGetStudentAttendanceQuery,
} from "@/redux/features/attendance/attendance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AttendanceStatusBadge } from "@/components/modules/attendance/AttendanceStatusBadge";
import type { TAttendance } from "@/types/student";

type Props = { params: Promise<{ id: string }> };

/**
 * Build the 6-row × 7-col month grid for a given anchor day. Cells
 * outside the current month are still rendered (dimmed) so the
 * weekday columns line up cleanly — admins scan a calendar left-to-
 * right and a holey grid is harder to read than a uniform one.
 *
 * The grid is anchored to the local-TZ day so the month boundaries
 * are correct for whoever is viewing the page (admin in BD), not
 * for the server's UTC offset.
 */
const buildMonthGrid = (anchor: Dayjs): Dayjs[] => {
  const startOfMonth = anchor.startOf("month");
  // Day-of-week for the 1st of the month, normalised to a 0-Sun
  // index to match dayjs().day() / the layout we want.
  const leadingBlanks = startOfMonth.day();
  const firstCell = startOfMonth.subtract(leadingBlanks, "day");
  // 6 weeks × 7 days = 42 cells. Always render a full 6-row grid so
  // the calendar height is stable across months.
  return Array.from({ length: 42 }, (_, i) => firstCell.add(i, "day"));
};

const formatMethod = (m: TAttendance["method"]) => {
  switch (m) {
    case "NFC":
      return "NFC card";
    case "MANUAL":
      return "Manual";
    case "ADMIN":
      return "Admin";
    default:
      return m;
  }
};

const StudentAttendancePage = ({ params }: Props) => {
  const { id } = use(params);
  // Calendar anchor — the first day of the month currently in view.
  // The grid always renders the full 6 weeks around this anchor so
  // navigating prev/next jumps by exactly one month.
  const [anchor, setAnchor] = useState<Dayjs>(dayjs().startOf("month"));
  // Range filter for the records table beneath the calendar. Defaults
  // to the current calendar month so the table matches the visible
  // grid out of the box.
  const [rangeStart, setRangeStart] = useState<string>(
    anchor.format("YYYY-MM-DD"),
  );
  const [rangeEnd, setRangeEnd] = useState<string>(
    anchor.endOf("month").format("YYYY-MM-DD"),
  );

  const { data: studentData, isLoading: isStudentLoading } =
    useGetStudentByIdQuery(id);
  const { data: attendanceData, isLoading: isAttendanceLoading } =
    useGetStudentAttendanceQuery({
      studentId: id,
      startDate: rangeStart,
      endDate: rangeEnd,
      // Backend validates `limit` to max 100 — sending more gets a 400
      // and the stats fall back to zeros. The all-time summary stats
      // come from `extraData` (computed independently of pagination on
      // the backend), so the page count cap doesn't affect % math.
      limit: 100,
    });

  // Index attendance rows by ISO yyyy-mm-dd so the calendar grid can
  // colour the matching day cell in O(1). We do this once per
  // `attendanceData` reference; the grid re-derives on every render
  // but dayjs() calls are cheap.
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, TAttendance>();
    const rows = attendanceData?.data ?? [];
    for (const row of rows) {
      // The backend returns `date` as an ISO yyyy-mm-dd (Prisma @db.Date
      // serialised as a string). dayjs() can parse that directly
      // without a custom format string.
      const key = dayjs(row.date).format("YYYY-MM-DD");
      map.set(key, row);
    }
    return map;
  }, [attendanceData?.data]);

  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);

  // Today marker — recomputed on every render but cheap.
  const todayIso = dayjs().format("YYYY-MM-DD");
  const monthLabel = anchor.format("MMMM YYYY");

  // Stats summary. `extraData` rides on every `/attendance/student/...`
  // response (see attendance.controller.ts) and carries the all-time
  // counts we want in the headline card. Fall back to a zeroed object
  // when the data hasn't arrived yet.
  const summary =
    (attendanceData as { extraData?: { totalPresent?: number; totalAbsent?: number; total?: number; percentage?: number } } | undefined)
      ?.extraData ?? { totalPresent: 0, totalAbsent: 0, total: 0, percentage: 0 };

  if (isStudentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!studentData?.data) {
    return <p className="text-muted-foreground">Student not found.</p>;
  }

  const student = studentData.data;

  const goPrevMonth = () =>
    setAnchor((a) => a.subtract(1, "month").startOf("month"));
  const goNextMonth = () =>
    setAnchor((a) => a.add(1, "month").startOf("month"));
  const goToday = () => {
    const now = dayjs();
    setAnchor(now.startOf("month"));
    setRangeStart(now.startOf("month").format("YYYY-MM-DD"));
    setRangeEnd(now.endOf("month").format("YYYY-MM-DD"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/students/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to student
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Attendance — {student.user.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Calendar view of all check-ins and absences. Click a day to
            jump to that month&apos;s records below.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          label="Total classes"
          value={String(summary.total ?? 0)}
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label="Present"
          value={String(summary.totalPresent ?? 0)}
          tone="emerald"
        />
        <Stat
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label="Absent"
          value={String(summary.totalAbsent ?? 0)}
          tone="destructive"
        />
        <Stat
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Attendance %"
          value={`${summary.percentage ?? 0}%`}
          tone={
            (summary.percentage ?? 0) >= 75
              ? "emerald"
              : (summary.percentage ?? 0) >= 50
                ? "amber"
                : "destructive"
          }
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">{monthLabel}</CardTitle>
            <CardDescription>
              Green = present, red = absent. Days outside the current
              month are dimmed.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="px-3"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const iso = d.format("YYYY-MM-DD");
              const isCurrentMonth = d.month() === anchor.month();
              const isToday = iso === todayIso;
              const row = attendanceByDate.get(iso);
              const status = (row?.status ?? "").toString();
              const isPresent = status === "PRESENT";
              const isAbsent = status === "ABSENT";
              // Base classes — every cell gets the same shape so the
              // grid is uniform. Status classes overlay on top:
              // present → green, absent → red, no data → neutral.
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => {
                    setRangeStart(
                      d.startOf("month").format("YYYY-MM-DD"),
                    );
                    setRangeEnd(d.endOf("month").format("YYYY-MM-DD"));
                    // Scroll the records section into view on
                    // narrow screens where the calendar sits above
                    // the table.
                    const el = document.getElementById("records-table");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={[
                    "relative h-16 sm:h-20 rounded-md border text-left p-1.5 transition-colors",
                    isCurrentMonth
                      ? "bg-background"
                      : "bg-muted/30 text-muted-foreground",
                    isToday
                      ? "ring-2 ring-primary"
                      : "",
                    isPresent
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : isAbsent
                        ? "border-destructive bg-destructive/10"
                        : "border-border hover:bg-muted/50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${iso}${isPresent ? " — present" : isAbsent ? " — absent" : ""}`}
                >
                  <div className="text-xs font-semibold">{d.date()}</div>
                  {isPresent && (
                    <CheckCircle2 className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {isAbsent && (
                    <XCircle className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-destructive" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card id="records-table">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Records</CardTitle>
          <CardDescription>
            Filter the table to a date range; clicking a calendar day
            above jumps the range to that month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label
                htmlFor="range-start"
                className="text-xs font-medium text-muted-foreground"
              >
                Start
              </label>
              <input
                id="range-start"
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="range-end"
                className="text-xs font-medium text-muted-foreground"
              >
                End
              </label>
              <input
                id="range-end"
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRangeStart("");
                setRangeEnd("");
              }}
            >
              Clear
            </Button>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                All ({(attendanceData?.data ?? []).length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {isAttendanceLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading attendance…
                </div>
              ) : (attendanceData?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No attendance records in this range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Check-in time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(attendanceData?.data ?? []).map((row: TAttendance) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {dayjs(row.date).format("DD MMM YYYY")}
                          <div className="text-xs text-muted-foreground">
                            {dayjs(row.date).format("dddd")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <AttendanceStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatMethod(row.method)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {dayjs(row.checkInAt).format("h:mm A")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const Stat = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "destructive";
}) => {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "destructive"
          ? "text-destructive"
          : "";
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className={`text-2xl font-semibold mt-1 ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

export default StudentAttendancePage;
