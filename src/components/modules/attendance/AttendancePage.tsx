"use client";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, ScanLine, X } from "lucide-react";
import { useGetTodayAttendanceQuery } from "@/redux/features/attendance/attendance";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hscBatches } from "@/constants/batches";
import type { TCourse } from "@/types/student";
import type { TCourseBatchDay } from "@/types/student";

const PAGE_SIZE = 30;

type TAttendanceFilters = {
  page: number;
  limit: number;
  hscBatch?: string;
  courseId?: string;
  /**
   * Batch time as the free-form string the BatchDay says (e.g.
   * "4:00 PM"). We send it verbatim to the server; the server
   * does an exact-match on `StudentBatch.batchTime`.
   */
  batchTime?: string;
};

/**
 * The filter state shown when the page first loads / after a
 * "Clear filters" click. Keeping it as a module constant means
 * the clear handler is a single source of truth — no risk of
 * forgetting to reset one of the fields.
 */
const DEFAULT_FILTERS: TAttendanceFilters = {
  page: 1,
  limit: PAGE_SIZE,
};

const AttendancePage = () => {
  const [filters, setFilters] = useState<TAttendanceFilters>(DEFAULT_FILTERS);
  const { data, isLoading, refetch } = useGetTodayAttendanceQuery(filters);
  const { data: coursesData } = useGetAllCoursesQuery(undefined);

  /**
   * Active courses — only ONGOING courses (the only ones that can
   * have a class today). We pull the full list and filter client-
   * side so the filter dropdown always reflects the latest state
   * without an extra round-trip.
   */
  const activeCourses: TCourse[] = useMemo(
    () =>
      (coursesData?.data ?? []).filter(
        (c) => (c.status ?? "ADMISSION") !== "COMPLETE",
      ),
    [coursesData],
  );

  /**
   * Selected course (used to derive the time dropdown). Null when
   * no course is selected.
   */
  const selectedCourse = useMemo(
    () => activeCourses.find((c) => c.id === filters.courseId) ?? null,
    [activeCourses, filters.courseId],
  );

  /**
   * BatchDay rows for the selected course. The "today" day is
   * implicit on the backend (the route is `/attendance/today`),
   * so the time options only need to consider today's slots.
   */
  const courseBatchDays: TCourseBatchDay[] = selectedCourse?.batchDays ?? [];

  /**
   * Time options for today. Since the route already filters to
   * today's date, we surface every time the course has scheduled
   * for today (union across all BatchDays' `times[]`). Times are
   * stored verbatim ("4:00 PM", "7:00 AM", etc.) so we render
   * them as-is in the Select.
   */
  const timeOptions = useMemo(() => {
    if (!selectedCourse) return [];
    const set = new Set<string>();
    for (const bd of courseBatchDays) {
      for (const t of bd.times ?? []) set.add(t);
    }
    return Array.from(set)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [selectedCourse, courseBatchDays]);

  /**
   * Course change clears the batch time — a time valid for one
   * course might not exist for another.
   */
  const onCourseChange = (courseId: string | undefined) => {
    setFilters((f) => ({
      ...f,
      courseId,
      batchTime: undefined,
      page: 1,
    }));
  };
  const onTimeChange = (batchTime: string | undefined) => {
    setFilters((f) => ({ ...f, batchTime, page: 1 }));
  };
  /**
   * "Clear filters" — wipes every user-driven filter and snaps
   * pagination back to page 1. The button is disabled when no
   * filter is set so the action is only available when it does
   * something.
   */
  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const hasActiveFilters =
    !!filters.hscBatch || !!filters.courseId || !!filters.batchTime;

  const total = data?.meta?.total ?? 0;
  const page = data?.meta?.page ?? 1;
  const limit = data?.meta?.limit ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  /**
   * Opens the automatic-attendance kiosk in a popup window. We use
   * `window.open` (not a `<Link>` or `router.push`) because the
   * kiosk is intended to be a separate full-screen surface — no
   * sidebar, no top tablist, just the scanner UI. `noopener,
   * noreferrer` keeps the new window from accessing `window.opener`
   * (security hardening for popups).
   */
  const openAutomaticAttendance = () => {
    if (typeof window === "undefined") return;
    window.open(
      "/attendance/automatic",
      "automatic-attendance-kiosk",
      "noopener,noreferrer,width=1280,height=800",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-sm text-muted-foreground">
            {dayjs().format("dddd, MMMM D, YYYY")} • {total} present
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAutomaticAttendance} className="gap-2">
            <ScanLine className="h-4 w-4" /> Take automatic attendance
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Cascading filters:
            Course → BatchTime (derived from the course's BatchDay.times).
          HSC Batch stays an independent (cross-course) filter. The
          attendance list is always for today — the day filter was
          removed because the route already pins to the current
          calendar day. */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.hscBatch || "_all"}
          onValueChange={(v) =>
            setFilters({
              ...filters,
              hscBatch: v === "_all" ? undefined : v,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="HSC Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All batches</SelectItem>
            {hscBatches.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.courseId || "_all"}
          onValueChange={(v) => onCourseChange(v === "_all" ? undefined : v)}
        >
          <SelectTrigger className="w-55">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All courses</SelectItem>
            {activeCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name.replace(/_/g, " ")}
                {c.status ? ` (${c.status})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.batchTime || "_all"}
          onValueChange={(v) => onTimeChange(v === "_all" ? undefined : v)}
          disabled={timeOptions.length === 0}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Batch time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All times</SelectItem>
            {timeOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*
          Clear-filters affordance. Lives in the same flex row as
          the Selects so the filter strip stays self-contained.
          Disabled when no user-driven filter is active (the
          default state is "show everything for today") so the
          button never no-ops.
        */}
        <Button
          type="button"
          variant="ghost"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          // Colourful gradient — pink → orange → amber. Drawn from
          // Tailwind's built-in palette so no custom CSS needed.
          // Hover deepens the gradient, focus keeps a visible ring
          // for keyboard users, and disabled fades to a muted grey
          // via the default `disabled:opacity-50` from buttonVariants.
          className="gap-1 text-white font-semibold shadow-sm border-0 bg-linear-to-r from-pink-500 via-orange-500 to-amber-500 hover:from-pink-600 hover:via-orange-600 hover:to-amber-600 focus-visible:ring-pink-400"
        >
          <X className="h-4 w-4" /> Clear filters
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Present Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded for</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No one has checked in yet today.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.student.user.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.student.user.mobile}
                      </TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {dayjs(a.date).format("ddd")}
                          </Badge>
                          <span className="text-xs">
                            {dayjs(a.date).format("MMM D")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {dayjs(a.checkInAt).format("h:mm A")}
                        <span className="text-muted-foreground ml-1">
                          {dayjs(a.checkInAt).format("MMM D")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.method}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer. `page` + `limit` + `total` come
              from the response meta; the server does the actual
              slicing. Buttons disable at the edges. */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "0 results"
                : `Showing ${(page - 1) * limit + 1}–${Math.min(
                    page * limit,
                    total,
                  )} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev || isLoading}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: Math.max(1, page - 1) }))
                }
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canNext || isLoading}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    page: Math.min(totalPages, page + 1),
                  }))
                }
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
