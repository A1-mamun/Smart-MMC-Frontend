"use client";
import { useState } from "react";
import dayjs from "dayjs";
import { ArrowLeftRight, ScanLine } from "lucide-react";
import { useGetTodayAttendanceQuery } from "@/redux/features/attendance/attendance";
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
import { Input } from "@/components/ui/input";
import { hscBatches } from "@/constants/batches";

const AttendancePage = () => {
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    hscBatch?: string;
    batchDay?: string;
    batchTime?: string;
  }>({
    page: 1,
    limit: 30,
  });
  const { data, isLoading, refetch } = useGetTodayAttendanceQuery(filters);

  /**
   * Opens the automatic-attendance kiosk in a popup window. We use
   * `window.open` (not a `<Link>` or `router.push`) because the
   * kiosk is intended to be a separate full-screen surface — no
   * sidebar, no top tablist, just the scanner UI. `noopener,
   noreferrer` keeps the new window from accessing `window.opener`
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
            {dayjs().format("dddd, MMMM D, YYYY")} • {data?.meta?.total || 0}{" "}
            present
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openAutomaticAttendance}
            // The kiosk button is the primary CTA on the attendance
            // page — placement to the right of the Refresh button
            // keeps the destructive / data-refresh actions grouped
            // while the new feature sits at the end of the row.
            className="gap-2"
          >
            <ScanLine className="h-4 w-4" /> Take automatic attendance
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

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
        <Input
          className="w-45"
          placeholder="Day (e.g. Saturday)"
          value={filters.batchDay || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              batchDay: e.target.value || undefined,
              page: 1,
            })
          }
        />
        <Input
          className="w-45"
          placeholder="Time (e.g. 4:00 PM)"
          value={filters.batchTime || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              batchTime: e.target.value || undefined,
              page: 1,
            })
          }
        />
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
                  <TableHead>Recorded for</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No one has checked in yet today.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((a) => (
                    <TableRow
                      key={a.id}
                      className={
                        a.swapFromDate ? "bg-amber-50/40" : undefined
                      }
                    >
                      <TableCell className="font-medium">
                        {a.student.user.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {/* Mobile replaces the dropped `User.studentId`
                            for the per-account identifier. */}
                        {a.student.user.mobile}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {dayjs(a.date).format("ddd")}
                          </Badge>
                          <span className="text-xs">
                            {dayjs(a.date).format("MMM D")}
                          </span>
                          {a.swapFromDate && (
                            <Badge
                              variant="warning"
                              className="text-[10px] gap-1"
                            >
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                              scanned {dayjs(a.swapFromDate).format("ddd")}
                            </Badge>
                          )}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
