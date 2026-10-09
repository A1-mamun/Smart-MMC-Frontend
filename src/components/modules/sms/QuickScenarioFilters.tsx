"use client";

import {
  CalendarDays,
  Filter,
  Wallet,
  AlertTriangle,
  RotateCcw,
  Layers,
} from "lucide-react";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetAllCoursesQuery,
  useGetCourseByIdQuery,
} from "@/redux/features/course/course";
import type { TCourseStatus } from "@/types/student";

/**
 * The preset filters that compose with the existing search /
 * course / batch-day UI. All values are additive — combining several
 * produces the intersection (e.g. "Saturday + HSC 1st + has due").
 *
 * Course / batch-day / time form a strict cascade:
 *   Course status  →  Course  →  Batch day  →  Time
 * Each field is enabled once its predecessor is set, and clearing
 * a parent field clears every child (the field-level `set` patch
 * does that explicitly — e.g. picking a course with no batch day
 * keeps `scenarioBatchDay` empty, but switching the course resets
 * the now-stale batch day / time values).
 */
export type QuickScenarioState = {
  /** ISO yyyy-mm-dd. Empty string means "any day". */
  classDate: string;
  /**
   * Course lifecycle stage. Empty string = "any status". Forwarded
   * as `courseStatus` to the student endpoint; the backend filters
   * via `studentCourses.some.course.status`. Mirrors the
   * Admission / Ongoing / Completed tabs on the Students page so
   * the SMS picker can target the same cohort (e.g. only students
   * whose enrollment is in the Admission stage, for a "first class
   * is tomorrow" reminder).
   */
  scenarioCourseStatus: TCourseStatus | "";
  /** Single course id (empty string = "any course"). */
  scenarioCourse: string;
  /**
   * BatchDay id within the selected course (empty string = "any
   * batch day"). The `Course → BatchDay` relation is fetched via
   * `useGetCourseByIdQuery` so the picker can render the
   * course's actual BatchDay rows as options.
   */
  scenarioBatchDay: string;
  /** Optional time slot within the selected course, e.g. "3:00 PM". */
  classTime: string;
  /** Students with at least one non-PAID enrollment. */
  hasDue: boolean;
  /**
   * ISO yyyy-mm-dd. When set, the cohort narrows to students whose
   * Attendance row for this exact date is marked `status = ABSENT`.
   * Powers the absent-warning manual filter on the SMS panel.
   * Caller is expected to cap to today or earlier (the backend clamps
   * as well). ABSENT rows are written by the attendance cron at
   * slot-finish time, so this matches what the Attendance page shows.
   */
  absentOnDate: string;
};

export const EMPTY_SCENARIO: QuickScenarioState = {
  classDate: "",
  classTime: "",
  scenarioCourse: "",
  scenarioBatchDay: "",
  scenarioCourseStatus: "",
  hasDue: false,
  absentOnDate: "",
};

type Props = {
  value: QuickScenarioState;
  onChange: (next: QuickScenarioState) => void;
};

const todayIso = () => dayjs().format("YYYY-MM-DD");

const QuickScenarioFilters = ({ value, onChange }: Props) => {
  const set = (patch: Partial<QuickScenarioState>) =>
    onChange({ ...value, ...patch });

  // Course list for the cascade. We filter client-side by
  // `scenarioCourseStatus` so the Course dropdown only shows rows
  // matching the picked status. Empty status = no filter.
  const { data: coursesData } = useGetAllCoursesQuery(
    { limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const allCourses = coursesData?.data || [];
  const courses = value.scenarioCourseStatus
    ? allCourses.filter((c) => c.status === value.scenarioCourseStatus)
    : allCourses;

  // When the user picks a course, fetch its BatchDay rows so the
  // BatchDay select can offer the real options. When no course is
  // picked, the BatchDay + Time selects are disabled (cascade rule).
  const firstCourseId = value.scenarioCourse;
  const { data: courseDetail } = useGetCourseByIdQuery(firstCourseId, {
    skip: !firstCourseId,
  });
  const batchDays = courseDetail?.data?.batchDays ?? [];

  // Times cascade off the picked batch day (so picking "Saturday /
  // 3:00 PM" only offers 3:00 PM). When no batch day is picked, the
  // time list is the union of every batch day's times so the admin
  // can still pick a global time without forcing a batch day.
  const pickedBatchDay = batchDays.find((d) => d.id === value.scenarioBatchDay);
  const availableTimes = pickedBatchDay
    ? pickedBatchDay.times
    : batchDays.flatMap((d) => d.times);

  const weekdayLabel = value.classDate
    ? dayjs(value.classDate).format("dddd")
    : "";

  return (
    <Card className="bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Quick scenarios
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Stack these with the search bar. Empty selectors mean &quot;no extra
          constraint&quot;. The Course / Batch day / Time row cascades — pick a
          status first, then a course, then a batch day, then a time.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Row 1: date + weekday preview */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* class date picker */}
          <div className="space-y-1">
            <Label htmlFor="scenario-date" className="text-xs">
              Class date
            </Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="scenario-date"
                type="date"
                value={value.classDate}
                min={todayIso()}
                onChange={(e) => set({ classDate: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>
          {/* weekday preview */}
          <div className="space-y-1">
            <Label className="text-xs">Preview</Label>
            <div className="rounded-md border bg-background px-3 py-2 text-sm flex items-center gap-2 min-h-10">
              {value.classDate ? (
                <Badge variant="secondary" className="gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {weekdayLabel}
                  {value.classTime ? ` · ${value.classTime}` : ""}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Any day</span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: cascading course selectors.
            Status → Course → BatchDay → Time.
            Each control is disabled until its parent is set, and
            switching a parent resets the stale children (e.g. picking
            a new course clears the batch day and time). */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* 1. Course status — top of the cascade. */}
          <div className="space-y-1">
            <Label htmlFor="scenario-course-status" className="text-xs">
              Course status (optional)
            </Label>
            <Select
              value={value.scenarioCourseStatus || "_any"}
              onValueChange={(v) =>
                set({
                  scenarioCourseStatus:
                    v === "_any" ? "" : (v as TCourseStatus),
                  // Reset children so a status change doesn't leak
                  // through a stale course / batch day / time.
                  scenarioCourse: "",
                  scenarioBatchDay: "",
                  classTime: "",
                })
              }
            >
              <SelectTrigger
                id="scenario-course-status"
                className="pl-9 relative"
              >
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any status</SelectItem>
                <SelectItem value="ADMISSION">Admission</SelectItem>
                <SelectItem value="ONGOING">Ongoing</SelectItem>
                <SelectItem value="COMPLETE">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Course — gated by status (any status = no gate). */}
          <div className="space-y-1">
            <Label className="text-xs">Course (optional)</Label>
            <Select
              value={value.scenarioCourse || "_any"}
              onValueChange={(v) =>
                set({
                  scenarioCourse: v === "_any" ? "" : v,
                  // Clear downstream picks that referenced the old
                  // course's BatchDay / times.
                  scenarioBatchDay: "",
                  classTime: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    courses.length === 0 ? "No courses yet" : "Any course"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Batch day — disabled until a course is picked. */}
          <div className="space-y-1">
            <Label className="text-xs">Batch day (optional)</Label>
            <Select
              value={value.scenarioBatchDay || "_any"}
              onValueChange={(v) =>
                set({
                  scenarioBatchDay: v === "_any" ? "" : v,
                  // Clear the time since the previous time may not
                  // exist in the newly-picked batch day.
                  classTime: "",
                })
              }
              disabled={!value.scenarioCourse}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !value.scenarioCourse
                      ? "Pick a course first"
                      : "Any batch day"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any batch day</SelectItem>
                {batchDays.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name || `Batch ${d.position + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Class time — disabled until a course is picked
              (the union of all times needs at least one batch day
              to come from). */}
          <div className="space-y-1">
            <Label className="text-xs">Class time (optional)</Label>
            <Select
              value={value.classTime || "_any"}
              onValueChange={(v) => set({ classTime: v === "_any" ? "" : v })}
              disabled={!value.scenarioCourse}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !value.scenarioCourse
                      ? "Pick a course first"
                      : availableTimes.length === 0
                        ? "No times configured"
                        : "Any time"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any time</SelectItem>
                {availableTimes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium leading-none">Has due payment</p>
                <p className="text-xs text-muted-foreground">
                  Status PARTIAL or PENDING
                </p>
              </div>
            </div>
            <Switch
              checked={value.hasDue}
              onCheckedChange={(v) => set({ hasDue: v })}
            />
          </div>
        </div>

        {/* Row: absent-warning picker */}
        <div className="space-y-1">
          <Label htmlFor="absent-date" className="text-xs">
            Class absent on date (warning)
          </Label>
          <div className="relative">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="absent-date"
              type="date"
              value={value.absentOnDate}
              max={todayIso()}
              onChange={(e) => set({ absentOnDate: e.target.value })}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Lists students the system has recorded as absent on this date
            (status = ABSENT). Pair with the warning template configured in
            Settings.
          </p>
        </div>

        {(value.classDate ||
          value.classTime ||
          value.scenarioCourse ||
          value.scenarioBatchDay ||
          value.scenarioCourseStatus ||
          value.hasDue ||
          value.absentOnDate) && (
          <div className="flex justify-end">
            {/*
              Reset affordance. Bright purple → indigo → blue
              gradient so it visually pops against the muted
              card background — distinct from the pink/orange
              "Clear filters" button on the attendance page so
              admins can tell the two apart at a glance. The
              gradient is drawn from Tailwind's built-in palette
              (no custom CSS). Hover deepens the gradient, the
              disabled opacity comes from the shared
              `buttonVariants` base styles. The `RotateCcw` icon
              is the canonical "undo/reset" glyph — the spin-on-
              hover trick would be cute but is omitted here
              because Tailwind doesn't ship a `group-hover:animate-*`
              out of the box.
            */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_SCENARIO)}
              className="gap-1 text-white font-semibold shadow-sm border-0 bg-linear-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-600 hover:via-indigo-600 hover:to-blue-600 focus-visible:ring-purple-400"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset scenarios
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickScenarioFilters;
