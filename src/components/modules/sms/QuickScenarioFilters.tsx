"use client";

import { CalendarDays, Filter, Wallet, Activity } from "lucide-react";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multiselect";
import {
  useGetAllCoursesQuery,
  useGetCourseByIdQuery,
} from "@/redux/features/course/course";

/**
 * The five preset filters that compose with the existing search /
 * course / batch-day UI. All values are additive — combining several
 * produces the intersection (e.g. "Saturday + HSC 1st + has due").
 */
export type QuickScenarioState = {
  /** ISO yyyy-mm-dd. Empty string means "any day". */
  classDate: string;
  /** Optional time slot, e.g. "3:00 PM". */
  classTime: string;
  /** Multi-select course ids (one or more). */
  scenarioCourses: string[];
  /** Students with at least one non-PAID enrollment. */
  hasDue: boolean;
  /** Students enrolled in at least one active course. */
  activeCoursesOnly: boolean;
};

export const EMPTY_SCENARIO: QuickScenarioState = {
  classDate: "",
  classTime: "",
  scenarioCourses: [],
  hasDue: false,
  // Default to "active courses only" so the picker excludes students whose
  // enrollments are all in archived / inactive courses. Users who want to
  // message every student (active + archived) can flip the toggle off.
  activeCoursesOnly: true,
};

type Props = {
  value: QuickScenarioState;
  onChange: (next: QuickScenarioState) => void;
};

const todayIso = () => dayjs().format("YYYY-MM-DD");

const QuickScenarioFilters = ({ value, onChange }: Props) => {
  const set = (patch: Partial<QuickScenarioState>) =>
    onChange({ ...value, ...patch });

  // Course list for the multi-select.
  const { data: coursesData } = useGetAllCoursesQuery(
    { isActive: true, limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];

  // When the user picks a class date, we need to know which BatchDay
  // rows run on that weekday. The simplest UX is to ask for the chosen
  // course first; if no course is picked we still surface a free-form
  // time input so the date filter works without a course scope.
  const firstCourseId = value.scenarioCourses[0] ?? "";
  const { data: courseDetail } = useGetCourseByIdQuery(firstCourseId, {
    skip: !firstCourseId,
  });
  const availableTimes =
    courseDetail?.data?.batchDays?.flatMap((d) => d.times) ?? [];

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
          Stack these with the search &amp; cascading filter below. Empty
          selectors mean "no extra constraint".
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Row 1: date + time + weekday preview */}
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

        {/* Row 2: multi-course + 2 toggles */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-1 space-y-1">
            <Label className="text-xs">Courses (1+)</Label>
            <MultiSelect
              options={courses.map((c) => ({
                value: c.id,
                label: c.name.replace(/_/g, " "),
              }))}
              values={value.scenarioCourses}
              onChange={(next) => set({ scenarioCourses: next })}
              placeholder={
                courses.length === 0 ? "No courses yet" : "Any course"
              }
            />
          </div>
          {/* batch time picker (depends on course selection) */}
          <div className="space-y-1">
            <Label className="text-xs">Class time (optional)</Label>
            <Select
              value={value.classTime || "_any"}
              onValueChange={(v) => set({ classTime: v === "_any" ? "" : v })}
              disabled={availableTimes.length === 0 && !value.classTime}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    availableTimes.length === 0
                      ? "Pick a course to see times"
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
          <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium leading-none">Active courses only</p>
                <p className="text-xs text-muted-foreground">
                  Skip inactive / archived
                </p>
              </div>
            </div>
            <Switch
              checked={value.activeCoursesOnly}
              onCheckedChange={(v) => set({ activeCoursesOnly: v })}
            />
          </div>
        </div>

        {(value.classDate ||
          value.classTime ||
          value.scenarioCourses.length > 0 ||
          value.hasDue ||
          value.activeCoursesOnly) && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChange(EMPTY_SCENARIO)}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Reset scenarios
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickScenarioFilters;
