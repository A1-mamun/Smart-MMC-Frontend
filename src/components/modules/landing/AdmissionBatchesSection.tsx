"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPublicAdmissionCoursesQuery } from "@/redux/features/course/course";
import type { TPublicCourse } from "@/redux/features/course/course";
import AdmissionCourseCard from "./AdmissionCourseCard";

/**
 * Number of skeleton cards rendered while the public admission
 * list is in-flight. Matches the typical 3-col grid at `lg` so
 * the page doesn't shift when the real cards arrive.
 */
const SKELETON_CARD_COUNT = 3;

/**
 * Landing-page "Admission batches" grid. Fetches the public
 * `GET /course/public/admission` endpoint (no auth, 60s server
 * cache) and renders one card per open course. The card body is
 * the shared `AdmissionCourseCard` so the home page and the
 * dedicated /batches page render the exact same per-slot
 * "Full / Open / X of Y" pills.
 *
 * Loading state: same header + 3 skeleton cards in the same
 * grid layout so the page doesn't shift. Empty / error: omit
 * the section entirely (no admission currently open → no
 * fallback card asking the user to register for a batch that
 * doesn't exist).
 */
const AdmissionBatchesSection = () => {
  const { data, isLoading, isError } =
    useGetPublicAdmissionCoursesQuery();
  const courses: TPublicCourse[] = data?.data ?? [];

  if (!isLoading && (isError || courses.length === 0)) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="h-3.5 w-3.5" />
            Admission Open
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Pick the batch that fits your schedule
          </h2>
          <p className="mt-3 text-muted-foreground">
            Live list of every batch currently accepting new students.
            Seats fill fast — register before the next slot starts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="space-y-4 p-6">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))
            : courses.map((course) => (
                <AdmissionCourseCard key={course.id} course={course} />
              ))}
        </div>

        {/*
         * Pointer to the dedicated /batches page. Both pages
         * now render the same per-slot pills, so this link is
         * a "see the same cards grouped by HSC batch with the
         * full seat breakdown" rather than a different view.
         */}
        {!isLoading && courses.length > 0 && (
          <div className="mt-10 text-center">
            <Button variant="outline" asChild>
              <Link href="/batches">View all batches with seat counts</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdmissionBatchesSection;
