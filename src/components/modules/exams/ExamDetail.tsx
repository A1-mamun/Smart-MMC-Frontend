"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, GraduationCap, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetExamPublishMutation } from "@/redux/features/exam/exam";
import RosterAttendance from "./RosterAttendance";
import ResultsEntry from "./ResultsEntry";
import TopTenBoard from "./TopTenBoard";
import ExamFormModal from "./ExamFormModal";
import type { TExam, TExamDetail } from "@/types/exam";

type Props = {
  exam: TExamDetail | undefined;
  isLoading: boolean;
  refetch: () => void;
};

const formatCourseName = (name?: string) => {
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "HSC Final Preparation",
    ADMISSION: "Admission",
  };
  return (name && map[name]) || name || "—";
};

const ExamDetail = ({ exam, isLoading, refetch }: Props) => {
  const [tab, setTab] = useState("overview");
  const [setPublish, { isLoading: publishing }] = useSetExamPublishMutation();

  // Date-gate used by RosterAttendance / ResultsEntry. Before the exam date
  // we don't yet know who showed up or what they scored, so we hide every
  // value that would imply otherwise. The "Total examinees" card stays
  // populated because that's a snapshot of who *could* take the exam, taken
  // at exam-creation time.
  //
  // This hook MUST be declared before the loading/empty early return below —
  // React's rules of hooks require that hooks run in the same order on every
  // render. If we skipped it on the skeleton render and ran it on the loaded
  // render, hook #N would shift and crash with "change in the order of Hooks".
  // Safe to read `exam.examDate` because we only *use* the result after the
  // early-return guard has confirmed `exam` is defined.
  const isBeforeExam = useMemo(
    () =>
      exam
        ? dayjs(exam.examDate).startOf("day").isAfter(dayjs().startOf("day"))
        : false,
    [exam?.examDate],
  );

  // Backend is the source of truth for publish gating — see
  // `setExamPublishToDB` in exam.service.ts. We mirror the rule here so the
  // button gives immediate feedback instead of waiting for a toast after
  // the click. The rule: at least one present student must have
  // `marksEntered = true`. Unpublish is always allowed.
  const canPublish = useMemo(() => {
    if (!exam) return true;
    if (exam.isResultPublished) return true;
    const present = exam.roster.filter((r) => !r.isAbsent);
    return present.length > 0 && present.some((r) => r.marksEntered);
  }, [exam?.isResultPublished, exam?.roster]);

  // Edit modal state. We always have the full `exam` (TExamDetail) loaded
  // via `useGetExamByIdQuery` on the parent page, so unlike the list page
  // we don't need a separate lazy-fetch — we project straight from `exam`
  // into the `TExam` shape the form modal expects. The memo re-runs when
  // `exam` changes, so after a save+refetch the next modal open will
  // reflect the updated title/sections/course automatically.
  const [editing, setEditing] = useState(false);
  const editableExam = useMemo<TExam | null>(() => {
    if (!exam) return null;
    return {
      id: exam.id,
      title: exam.title,
      syllabus: exam.syllabus,
      examDate: exam.examDate,
      courseId: exam.courseId,
      course: exam.course,
      totalMarks: exam.totalMarks,
      isResultPublished: exam.isResultPublished,
      publishedAt: exam.publishedAt ?? null,
      sections: exam.sections,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }, [exam]);

  if (isLoading || !exam) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handlePublishToggle = async () => {
    try {
      console.log(
        "Toggling publish state for exam",
        exam.id,
        "from",
        exam.isResultPublished,
        "to",
        !exam.isResultPublished,
      );
      const res = await setPublish({
        id: exam.id,
        isResultPublished: !exam.isResultPublished,
      }).unwrap();

      console.log("Publish toggle response:", res);

      // console.log("Publish toggle response:", res);
      toast.success(
        exam.isResultPublished ? "Results unpublished" : "Results published",
      );
      refetch();
    } catch (e) {
      // console.error("Failed to toggle exam publish state", e);
      const msg =
        (e as { data?: { message?: string } })?.data?.message ?? "Failed";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/exams">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{exam.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              {formatCourseName(exam.course?.name)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {dayjs(exam.examDate).format("DD MMM YYYY")}
            </span>
            <span>· Total marks: {exam.totalMarks}</span>
            <span>· Sections: {exam.sections.length}</span>
            {exam.isResultPublished ? (
              <Badge variant="success">Published</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!exam.isResultPublished && (
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${exam.title}`}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          <Button
            variant={exam.isResultPublished ? "outline" : "default"}
            onClick={handlePublishToggle}
            disabled={publishing || (!exam.isResultPublished && !canPublish)}
            title={
              !exam.isResultPublished && !canPublish
                ? "Enter marks for at least one present student before publishing."
                : undefined
            }
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            {exam.isResultPublished ? "Unpublish results" : "Publish results"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="Total examinees" value={exam.roster.length} />
        <Stat
          label="Present"
          value={formatStat(isBeforeExam ? null : exam.stats.presentCount)}
        />
        <Stat
          label="Absent"
          value={formatStat(isBeforeExam ? null : exam.stats.absentCount)}
        />
        <Stat
          label="Highest marks"
          value={formatStat(
            isBeforeExam || exam.stats.highestMarks === 0
              ? null
              : exam.stats.highestMarks,
          )}
        />
        <Stat
          label="Average marks"
          value={formatStat(
            isBeforeExam || exam.stats.averageMarks === 0
              ? null
              : exam.stats.averageMarks,
          )}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roster">
            Examinees ({exam.roster.length})
          </TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="topten">Top 10</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Syllabus</CardTitle>
              <CardDescription>Topics covered in this exam</CardDescription>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {exam.syllabus}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exam.sections.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.type} · {s.totalQuestions} questions ×{" "}
                      {s.marksPerQuestion} marks
                    </p>
                  </div>
                  <Badge variant="outline">{s.totalMarks} marks</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster">
          <RosterAttendance exam={exam} refetch={refetch} />
        </TabsContent>

        <TabsContent value="results">
          <ResultsEntry exam={exam} refetch={refetch} />
        </TabsContent>

        <TabsContent value="topten">
          <TopTenBoard exam={exam} />
        </TabsContent>
      </Tabs>

      {editing && editableExam && (
        <ExamFormModal
          open={editing}
          exam={editableExam}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            // Close the modal first for immediate feedback. The
            // `useUpdateExamMutation` already invalidates `Exam:{id}` +
            // `ExamResult`, so the underlying RTK Query will auto-refetch
            // this detail — we additionally call `refetch()` for parity
            // with the list page (belt-and-suspenders, same pattern as
            // `Exams.tsx`'s onSaved).
            setEditing(false);
            try {
              await refetch();
            } catch {
              /* refetch failures surface via the query state itself */
            }
          }}
        />
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <Card>
    <CardContent className="pt-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </CardContent>
  </Card>
);

// For stats that are meaningless before the exam date we render "—" (an em
// dash) instead of a misleading zero. After the exam date we fall back to
// the actual value (or 0 if it really is zero).
const formatStat = (v: number | null): number | string => {
  if (v === null) return "—";
  return v;
};

export default ExamDetail;
