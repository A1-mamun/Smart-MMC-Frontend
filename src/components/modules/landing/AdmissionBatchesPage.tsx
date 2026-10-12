"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  GraduationCap,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TPublicCourse,
  useGetPublicAdmissionCoursesQuery,
} from "@/redux/features/course/course";
import { hscBatches } from "@/constants/batches";
import AdmissionCourseCard from "./AdmissionCourseCard";

/**
 * SKELETON_CARD_COUNT — number of skeleton cards rendered while
 * the public admission list is in-flight. Matches the typical
 * 2-col grid at `md` so the page doesn't shift when the real
 * data arrives.
 */
const SKELETON_CARD_COUNT = 4;

const hscLabel = (value: string) =>
  hscBatches.find((b) => b.value === value)?.label ?? value;

/**
 * Full "Admission Batches" landing page. Lists every course
 * currently in `ADMISSION` status, grouped by HSC batch. Each
 * card is the shared `AdmissionCourseCard` (same component the
 * home-page section renders), so the per-slot "Full / Open /
 * X of Y" pills are byte-identical between the two surfaces.
 *
 * Mirrors the data shape returned by
 * `GET /course/public/admission` (no auth, 60s cache). Empty
 * state: friendly message pointing the visitor at the contact
 * page (admin can move a course out of ADMISSION if all
 * batches are filled).
 */
const AdmissionBatchesPage = () => {
  const { data, isLoading, isError } =
    useGetPublicAdmissionCoursesQuery();
  const courses: TPublicCourse[] = data?.data ?? [];

  /**
   * Group courses by HSC batch so the page reads as
   * "HSC 25 → 3 courses, HSC 26 → 1 course" rather than a
   * flat grid. We use the HSC value as the key (it's already
   * stable: BATCH_25 / BATCH_26 / …) and pull the human label
   * from the constants file at render time.
   *
   * Unrecognised HSC values fall back to the raw value as the
   * group label — defensive so a future enum extension
   * doesn't blow up the page.
   */
  const grouped = useMemo(() => {
    const map = new Map<string, TPublicCourse[]>();
    for (const c of courses) {
      const key = c.hscBatch ?? "OTHER";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    // Stable display order: known HSC batches in the order
    // they appear in `hscBatches`, then any unknown groups
    // tacked on at the end.
    const ordered: Array<[string, TPublicCourse[]]> = [];
    for (const { value } of hscBatches) {
      const list = map.get(value);
      if (list && list.length > 0) ordered.push([value, list]);
    }
    for (const [key, list] of map) {
      if (!ordered.find(([k]) => k === key)) ordered.push([key, list]);
    }
    return ordered;
  }, [courses]);

  return (
    <div className="space-y-10 py-10">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="h-3.5 w-3.5" />
            Admission Open
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Pick the batch that fits your schedule
          </h1>
          <p className="mt-3 text-muted-foreground">
            Every batch currently accepting new students. Live seat counts so
            you know exactly which slots are still open before you register.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="space-y-3 p-6">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError || courses.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-10 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground opacity-60" />
              <p className="text-lg font-semibold">
                No batches are open for admission right now.
              </p>
              <p className="text-sm text-muted-foreground">
                We open new batches at the start of each intake window. Use the
                contact section below to be notified when admissions re-open, or
                check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {grouped.map(([hscValue, list]) => (
              <section key={hscValue}>
                <div className="mb-5 flex items-end justify-between gap-2 border-b pb-2">
                  <h2 className="text-xl font-bold tracking-tight">
                    {hscLabel(hscValue)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {list.length} batch{list.length === 1 ? "" : "es"} available
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {list.map((course) => (
                    <AdmissionCourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Helper legend for the seat badges. Lives at the
          bottom of the page so first-time visitors can decode
          the "Full" / "Open" pills without a tooltip. Uses
          the same CheckCircle2 / XCircle icons as the badge
          colour so it's not a re-read of the API. */}
      {!isLoading && courses.length > 0 && (
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Open — seats available
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              Full — no seats left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionBatchesPage;
