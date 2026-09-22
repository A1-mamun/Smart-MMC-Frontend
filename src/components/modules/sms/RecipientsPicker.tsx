"use client";

import { useMemo, useState } from "react";
import { Search, X, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import {
  useGetAllCoursesQuery,
  useGetCourseByIdQuery,
} from "@/redux/features/course/course";
import type { TCourseBatchDay, TStudent } from "@/types/student";
import type { TSmsRecipient } from "@/types/sms";
import { formatBatchLabel, formatBatchDayLabel } from "@/constants/labels";
import QuickScenarioFilters, {
  EMPTY_SCENARIO,
  type QuickScenarioState,
} from "./QuickScenarioFilters";

/**
 * Decide which mobile to send to when the admin is using the
 * absent-warning picker. Mirrors the backend's father → mother → self
 * fallback chain. When `absentOnDate` is empty (regular flow), we keep
 * the existing behaviour of using the student's own mobile.
 */
const pickWarningMobile = (s: TStudent, absentOnDate: string): string => {
  if (!absentOnDate) return s.mobile;
  return s.fatherMobile || s.motherMobile || s.mobile;
};

type Props = {
  /** Already-selected recipients that the picker should reflect on mount. */
  initial?: TSmsRecipient[];
  /** Notified whenever the selection changes so the parent can re-render. */
  onChange: (recipients: TSmsRecipient[]) => void;
};

/**
 * Picker UI used by the SMS composer. Same cascading filter pattern as
 * `Students.tsx` — Course → Batch Day → (optional HSC batch via free search) —
 * so users who already know how the Students list works can reuse the same
 * mental model.
 *
 * Source of truth for students is `useGetAllStudentsQuery({ limit: 500 })`,
 * which is the same endpoint the Students page uses. We deliberately cap
 * the local limit (rather than paginating) so the picker always shows the
 * entire cohort in one screen — paginated pickers tend to confuse users
 * who forget to advance pages.
 */
const RecipientsPicker = ({ initial = [], onChange }: Props) => {
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchDayId, setBatchDayId] = useState("");
  // The picker is fully controlled: `selected` is read straight from the
  // parent's `initial` prop and every mutation just calls `onChange(next)`.
  // We deliberately avoid a parallel `useState` here because dual sources
  // of truth can drift across renders (e.g. when the student list refetches
  // after a filter change). All counts in the picker header, the SmsPage
  // summary card, and the Send button therefore reflect the same array.
  const selected = initial;
  // Quick-scenario state (date / time / multi-course / due / active).
  // Additive with the search/course/batchday filters above.
  const [scenario, setScenario] = useState<QuickScenarioState>(EMPTY_SCENARIO);

  const { data: coursesData } = useGetAllCoursesQuery(
    { isActive: true, limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];

  const { data: courseDetail } = useGetCourseByIdQuery(courseId, {
    skip: !courseId,
  });

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

  // Pull enough rows so the picker covers every active student. All
  // scenario values merge in as additional URLSearchParams via the
  // student's `useGetAllStudentsQuery({ ... })` shim — it ignores unknown
  // keys but forwards every one.
  const { data: studentsData, isFetching } = useGetAllStudentsQuery(
    {
      ...(search ? { searchTerm: search } : {}),
      ...(courseId ? { courseId } : {}),
      ...(batchDayId ? { batchDayId } : {}),
      ...(scenario.classDate ? { classDate: scenario.classDate } : {}),
      ...(scenario.classTime ? { classTime: scenario.classTime } : {}),
      ...(scenario.scenarioCourses.length > 0
        ? { scenarioCourses: scenario.scenarioCourses.join(",") }
        : {}),
      ...(scenario.hasDue ? { hasDue: true } : {}),
      ...(scenario.activeCoursesOnly ? { activeCoursesOnly: true } : {}),
      ...(scenario.absentOnDate ? { absentOnDate: scenario.absentOnDate } : {}),
      limit: 500,
    },
    { refetchOnMountOrArgChange: true },
  );
  const students = studentsData?.data || [];

  const toggleRecipient = (r: TSmsRecipient) => {
    const exists = selected.some((p) => p.studentId === r.studentId);
    const next = exists
      ? selected.filter((p) => p.studentId !== r.studentId)
      : [...selected, r];
    onChange(next);
  };

  const toggleAllVisible = () => {
    const visibleIds = new Set(students.map((s) => s.id));
    const allVisibleSelected = students.every((s) =>
      selected.some((p) => p.studentId === s.id),
    );
    const next = allVisibleSelected
      ? selected.filter((p) => !visibleIds.has(p.studentId))
      : [
          ...selected,
          ...students
            .filter((s) => !selected.some((p) => p.studentId === s.id))
            .map((s) => ({
              studentId: s.id,
              name: s.user.name,
              mobile: pickWarningMobile(s, scenario.absentOnDate),
            })),
        ];
    onChange(next);
  };

  const clearSelection = () => {
    onChange([]);
  };

  const removeOne = (studentId: string) => {
    onChange(selected.filter((p) => p.studentId !== studentId));
  };

  const visibleAllSelected =
    students.length > 0 &&
    students.every((s) => selected.some((p) => p.studentId === s.id));

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recipients ({selected.length} selected)
          </CardTitle>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, student ID, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={courseId || "_all"}
              onValueChange={(v) => {
                const next = v === "_all" ? "" : v;
                setCourseId(next);
                setBatchDayId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={batchDayId || "_all"}
              onValueChange={(v) => setBatchDayId(v === "_all" ? "" : v)}
              disabled={availableBatchDays.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    availableBatchDays.length === 0
                      ? "Pick a course first"
                      : "All batch days"
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
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <QuickScenarioFilters value={scenario} onChange={setScenario} />

        <div className="rounded-md border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
            <span>
              {isFetching
                ? "Loading…"
                : `${students.length} student${students.length === 1 ? "" : "s"} match`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={toggleAllVisible}
              disabled={students.length === 0}
            >
              {visibleAllSelected ? "Deselect all" : "Select all"}
            </Button>
          </div>
          <div className="max-h-105 overflow-y-auto divide-y">
            {students.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No students match the current filter.
              </div>
            ) : (
              students.map((s) => {
                const isSelected = selected.some((p) => p.studentId === s.id);
                const batch = s.batches?.[0];
                return (
                  <label
                    key={s.id}
                    className="flex items-start gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() =>
                        toggleRecipient({
                          studentId: s.id,
                          name: s.user.name,
                          mobile: pickWarningMobile(s, scenario.absentOnDate),
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{s.user.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {s.user.studentId} · {s.mobile}
                      </div>
                      {batch && (
                        <div className="mt-1 flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {formatBatchLabel(batch.hscBatch)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatBatchDayLabel(batch.batchDay)}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Selected recipients ({selected.length})
            </p>
            <div className="flex flex-wrap gap-1 px-2 pb-2">
              {selected.map((r) => (
                <Badge
                  key={r.studentId}
                  variant="secondary"
                  className="gap-1 text-xs"
                >
                  {r.name}
                  <button
                    type="button"
                    onClick={() => removeOne(r.studentId)}
                    className="ml-1 rounded-full hover:bg-destructive/20"
                    aria-label={`Remove ${r.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipientsPicker;
