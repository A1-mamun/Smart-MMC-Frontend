"use client";
import { useState } from "react";
import dayjs from "dayjs";
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
  const [filters, setFilters] = useState<{ page: number; limit: number; hscBatch?: string; batchDay?: string; batchTime?: string }>({
    page: 1,
    limit: 30,
  });
  const { data, isLoading, refetch } = useGetTodayAttendanceQuery(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-sm text-muted-foreground">
            {dayjs().format("dddd, MMMM D, YYYY")} • {data?.meta?.total || 0} present
          </p>
        </div>
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.hscBatch || "_all"}
          onValueChange={(v) => setFilters({ ...filters, hscBatch: v === "_all" ? undefined : v, page: 1 })}
        >
          <SelectTrigger className="w-[180px]">
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
          className="w-[180px]"
          placeholder="Day (e.g. Saturday)"
          value={filters.batchDay || ""}
          onChange={(e) => setFilters({ ...filters, batchDay: e.target.value || undefined, page: 1 })}
        />
        <Input
          className="w-[180px]"
          placeholder="Time (e.g. 4:00 PM)"
          value={filters.batchTime || ""}
          onChange={(e) => setFilters({ ...filters, batchTime: e.target.value || undefined, page: 1 })}
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
                  <TableHead>Check-in</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
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
                        {a.student.user.studentId}
                      </TableCell>
                      <TableCell>{dayjs(a.checkInAt).format("h:mm A")}</TableCell>
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