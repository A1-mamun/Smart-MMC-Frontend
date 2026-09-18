"use client";
import { useState } from "react";
import { Award, Calendar, GraduationCap, Medal, Trophy } from "lucide-react";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetMyResultsQuery } from "@/redux/features/exam/exam";
import type { TMyResult } from "@/types/exam";

const formatCourseName = (name?: string) => {
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "HSC Final Preparation",
    ADMISSION: "Admission",
  };
  return (name && map[name]) || name || "—";
};

const rankIcon = (rank: number | null) => {
  if (rank == null) return null;
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return null;
};

const StudentExams = () => {
  const { data, isLoading, isFetching } = useGetMyResultsQuery({});
  const [open, setOpen] = useState<TMyResult | null>(null);

  const results = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Exams &amp; Results</h2>
        <p className="text-sm text-muted-foreground">
          Click any exam to see the per-section breakdown.
        </p>
      </div>

      {isLoading || isFetching ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10 text-muted-foreground">
            No published results yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((r) => (
            <Card
              key={r.resultId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setOpen(r)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{r.examTitle}</CardTitle>
                  {r.rank != null && (
                    <Badge
                      variant={
                        r.rank === 1
                          ? "success"
                          : r.rank <= 3
                            ? "secondary"
                            : "outline"
                      }
                      className="gap-1"
                    >
                      {rankIcon(r.rank)} #{r.rank}
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex flex-wrap gap-3 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {formatCourseName(r.courseName)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {dayjs(r.examDate).format("DD MMM YYYY")}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Your marks</p>
                    <p className="text-xl font-semibold">
                      {r.obtainedMarks}
                      <span className="text-sm text-muted-foreground">
                        /{r.totalMarks}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Highest</p>
                    <p className="text-xl font-semibold text-yellow-600">
                      {r.highestMarks}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rank</p>
                    <p className="text-xl font-semibold">
                      {r.rank != null ? `#${r.rank}` : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{open.examTitle}</DialogTitle>
              <DialogDescription>
                {formatCourseName(open.courseName)} ·{" "}
                {dayjs(open.examDate).format("DD MMM YYYY")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center rounded-md bg-muted/30 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Your marks</p>
                  <p className="text-lg font-semibold">
                    {open.obtainedMarks}/{open.totalMarks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Highest</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {open.highestMarks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rank</p>
                  <p className="text-lg font-semibold">
                    {open.rank != null ? `#${open.rank}` : "—"}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {open.sections.map((s) => (
                    <TableRow key={s.sectionId}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.obtainedMarks}/{s.totalMarks}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default StudentExams;