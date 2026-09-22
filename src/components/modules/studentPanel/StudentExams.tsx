"use client";
import { useState } from "react";
import {
  Award,
  Calendar,
  GraduationCap,
  Medal,
  Trophy,
  ClipboardList,
  Eye,
} from "lucide-react";
import dayjs from "dayjs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  useGetMyResultsQuery,
  useGetMyUpcomingExamsQuery,
} from "@/redux/features/exam/exam";
import type { TMyResult, TMyUpcomingExam } from "@/types/exam";

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
  // Both queries are unconditionally invoked so switching between
  // Upcoming and Previous is instant — no network round-trip on tab
  // toggle.
  const { data: upcomingData, isLoading: upcomingLoading } =
    useGetMyUpcomingExamsQuery({});
  const { data: pastData, isLoading: pastLoading, isFetching: pastFetching } =
    useGetMyResultsQuery({});

  const [openResult, setOpenResult] = useState<TMyResult | null>(null);
  const [openUpcoming, setOpenUpcoming] = useState<TMyUpcomingExam | null>(null);

  const upcoming = upcomingData?.data ?? [];
  const past = pastData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Exams &amp; Results</h2>
        <p className="text-sm text-muted-foreground">
          See every upcoming exam on your enrolled courses and your previous
          results in one place.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="previous">
            Previous
            {past.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {past.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/*
          Upcoming tab: every exam whose `examDate >= today` across the
          student's active enrollments (sorted soonest-first by the
          backend). The Eye icon in the last column opens the syllabus /
          details dialog for that exam.
        */}
        <TabsContent value="upcoming">
          {upcomingLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No upcoming exams scheduled.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Sections</TableHead>
                    <TableHead className="text-center">Total Marks</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Countdown</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((e) => {
                    const isToday = dayjs(e.examDate).isSame(dayjs(), "day");
                    const daysLeft = dayjs(e.examDate).diff(dayjs(), "day");
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell>{formatCourseName(e.courseName)}</TableCell>
                        <TableCell>
                          {dayjs(e.examDate).format("DD MMM YYYY")}
                        </TableCell>
                        <TableCell className="text-center">
                          {e.sectionCount}
                        </TableCell>
                        <TableCell className="text-center">
                          {e.totalMarks}
                        </TableCell>
                        <TableCell className="text-center">
                          {e.isResultPublished ? (
                            <Badge variant="success">Published</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isToday ? (
                            <Badge variant="default">Today</Badge>
                          ) : daysLeft > 0 ? (
                            <Badge variant="secondary">{daysLeft}d left</Badge>
                          ) : (
                            <Badge variant="outline">Awaiting result</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`View details for ${e.title}`}
                            onClick={() => setOpenUpcoming(e)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/*
          Previous tab: published results the student has marks for.
          The Eye icon in the last column opens the per-section breakdown
          dialog for that result.
        */}
        <TabsContent value="previous">
          {pastLoading || pastFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : past.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No published results yet.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Your Marks</TableHead>
                    <TableHead className="text-center">Highest</TableHead>
                    <TableHead className="text-center">Rank</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {past.map((r) => (
                    <TableRow key={r.resultId}>
                      <TableCell className="font-medium">
                        {r.examTitle}
                      </TableCell>
                      <TableCell>{formatCourseName(r.courseName)}</TableCell>
                      <TableCell>
                        {dayjs(r.examDate).format("DD MMM YYYY")}
                      </TableCell>
                      {/*
                        Marks/highest/rank are gated on `isResultPublished`
                        AND on `hasResultRow`. The latter covers synthetic
                        entries — exams the student is enrolled in but not
                        on the roster of. Showing zeros there would be
                        misleading, so we replace them with an
                        "Awaiting your marks" badge.
                      */}
                      <TableCell className="text-center">
                        {!r.isResultPublished ? (
                          <Badge variant="outline">Pending publish</Badge>
                        ) : !r.hasResultRow ? (
                          <Badge variant="secondary">Awaiting your marks</Badge>
                        ) : (
                          <>
                            <span className="font-semibold">
                              {r.obtainedMarks}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              /{r.totalMarks}
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-yellow-600">
                        {r.isResultPublished && r.hasResultRow
                          ? r.highestMarks
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.isResultPublished && r.hasResultRow ? (
                          r.rank != null ? (
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
                          ) : (
                            "—"
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`View details for ${r.examTitle}`}
                          onClick={() => setOpenResult(r)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/*
        Per-section breakdown dialog — shown when the student clicks a
        card in the "Previous" tab.
      */}
      <Dialog open={!!openResult} onOpenChange={(o) => !o && setOpenResult(null)}>
        {openResult && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{openResult.examTitle}</DialogTitle>
              <DialogDescription>
                {formatCourseName(openResult.courseName)} ·{" "}
                {dayjs(openResult.examDate).format("DD MMM YYYY")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/*
                Marks are gated on both publish and roster membership.
                - Unpublished → "awaiting publish" notice.
                - Published but student not on roster → "awaiting your
                  marks" notice (the admin hasn't recorded marks for this
                  student yet, so showing zeros would be misleading).
                - Otherwise → full marks breakdown.
              */}
              {!openResult.isResultPublished ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Results for this exam have not been published yet. Marks
                  will appear here once the admin publishes them.
                </div>
              ) : !openResult.hasResultRow ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  This exam belongs to one of your enrolled courses, but
                  your marks have not been recorded yet. They will
                  appear here once the admin adds your result.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/30 p-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Your marks</p>
                      <p className="text-lg font-semibold">
                        {openResult.obtainedMarks}/{openResult.totalMarks}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Highest</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        {openResult.highestMarks}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rank</p>
                      <p className="text-lg font-semibold">
                        {openResult.rank != null ? `#${openResult.rank}` : "—"}
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
                      {openResult.sections.map((s) => (
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
                </>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/*
        Upcoming-exam syllabus dialog — shown when the student clicks a
        card in the "Upcoming" tab so they can read the syllabus /
        coverage ahead of time.
      */}
      <Dialog
        open={!!openUpcoming}
        onOpenChange={(o) => !o && setOpenUpcoming(null)}
      >
        {openUpcoming && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                {openUpcoming.title}
              </DialogTitle>
              <DialogDescription>
                {formatCourseName(openUpcoming.courseName)} ·{" "}
                {dayjs(openUpcoming.examDate).format("DD MMM YYYY")} ·{" "}
                {openUpcoming.totalMarks} marks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/30 p-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Sections</p>
                  <p className="text-lg font-semibold">
                    {openUpcoming.sectionCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total marks</p>
                  <p className="text-lg font-semibold">
                    {openUpcoming.totalMarks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {openUpcoming.isResultPublished ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/*
                Section details — Section / Type / Questions /
                Marks-per-question / Total. The backend now includes this
                lightweight summary inline so we don't need a second
                round-trip. Each row shows the per-section structure
                the student will be tested on.
              */}
              {openUpcoming.sections.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] uppercase text-muted-foreground">
                    Section Details
                  </p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center">
                            Questions
                          </TableHead>
                          <TableHead className="text-center">
                            Marks / Q
                          </TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openUpcoming.sections.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              {s.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{s.type}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {s.totalQuestions}
                            </TableCell>
                            <TableCell className="text-center">
                              {s.marksPerQuestion}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {s.totalMarks}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase text-muted-foreground">
                  Syllabus
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {openUpcoming.syllabus || "—"}
                </p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default StudentExams;
