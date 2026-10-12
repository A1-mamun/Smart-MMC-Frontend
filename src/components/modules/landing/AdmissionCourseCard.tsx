"use client";

import Link from "next/link";
import { CalendarDays, Clock, GraduationCap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hscBatches } from "@/constants/batches";
import type { TPublicCourse } from "@/redux/features/course/course";
import type { TPublicCourseBatchDay } from "@/types/student";

/**
 * Per-(batchDay, batchTime) seat-count pill. Three states:
 *   - Uncapped (capacity == null): green "Open · uncapped"
 *   - Capped AND full: red "Full · X / Y"
 *   - Capped AND has room: green "X / Y seats"
 *
 * Lives in this shared module so the home-page section
 * (`AdmissionBatchesSection`) and the dedicated /batches page
 * (`AdmissionBatchesPage`) render the exact same pill — the
 * two surfaces must not drift, otherwise visitors will see
 * different "Full / Open" semantics on the home page vs. the
 * detail page.
 */
export const SlotCapacityBadge = ({
  slot,
}: {
  slot: TPublicCourseBatchDay["slots"][number];
}) => {
  if (slot.capacity == null) {
    return (
      <Badge variant="success" className="text-[10px]">
        Open · uncapped
      </Badge>
    );
  }
  if (slot.isFull) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Full · {slot.enrolled}/{slot.capacity}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="text-[10px]">
      {slot.enrolled}/{slot.capacity} seats
    </Badge>
  );
};

const formatTaka = (n: number | string) => `৳${Number(n).toLocaleString()}`;

const dayShort = (d: string) => d.slice(0, 3);

const courseLabel = (name: string) =>
  name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const hscLabel = (value: string) =>
  hscBatches.find((b) => b.value === value)?.label ?? value;

/**
 * Single admission-course card. Mirrors the data shape returned
 * by `GET /course/public/admission`: header (name + HSC + Open
 * badge), per-BatchDay block with schedule + per-slot capacity
 * pills, footer (admit count + fee), and a Register CTA.
 *
 * Shared between the home-page section and the /batches page
 * so the two surfaces can't drift.
 */
const AdmissionCourseCard = ({ course }: { course: TPublicCourse }) => {
  return (
    <Card className="overflow-hidden border-emerald-200/60 transition hover:-translate-y-1 hover:shadow-lg dark:border-emerald-900/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg leading-tight">
              {courseLabel(course.name)}
            </CardTitle>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {hscLabel(course.hscBatch)} · {course.name.replace(/_/g, " ")}
            </p>
          </div>
          <Badge variant="success" className="shrink-0">
            Open
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {course.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        ) : null}

        {course.batchDays.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            Schedule not yet announced.
          </p>
        ) : (
          <div className="space-y-3">
            {course.batchDays.map((bd) => (
              <div
                key={bd.id}
                className="rounded-md border bg-muted/20 p-3 text-sm"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {bd.name ??
                      (bd.days.length > 0
                        ? bd.days.map((d) => dayShort(d)).join(", ")
                        : "Batch")}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {bd.durationMinutes} min / class
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {bd.days.length > 0
                      ? bd.days.map((d) => dayShort(d)).join(", ")
                      : "—"}
                  </span>
                </p>
                <div className="mt-2 space-y-1.5">
                  {bd.slots.map((slot) => (
                    <div
                      key={`${bd.id}-${slot.time}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-background px-2.5 py-1.5"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {slot.time}
                      </span>
                      <SlotCapacityBadge slot={slot} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {course._count?.studentCourses ?? 0} student
              {(course._count?.studentCourses ?? 0) === 1 ? "" : "s"} admitted
              so far
            </span>
          </div>
          <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
            {formatTaka(course.fee)}
          </span>
        </div>

        {/*
         * CTA is per-card rather than per-slot because
         * registration happens at the course level — the
         * admin's admit form is what binds a student to a
         * specific (course, batchDay, time) combo. The
         * per-slot capacity pills above let the visitor
         * self-select the right slot before they hit
         * "Register now".
         */}
        {/* <Button asChild className="w-full">
          <Link href="/register">Register now</Link>
        </Button> */}
      </CardContent>
    </Card>
  );
};

export default AdmissionCourseCard;
