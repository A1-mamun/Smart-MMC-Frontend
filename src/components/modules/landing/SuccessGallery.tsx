"use client";

import Image from "next/image";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGetSuccessStudentsQuery } from "@/redux/features/successStudent/successStudent.api";
import { TSuccessStudent } from "@/types/successStudent";

/**
 * Number of skeleton cards to render while the data is loading.
 * Eight matches the typical full grid at the `md` breakpoint
 * (4 cols × 2 rows), so the skeleton fills the same vertical
 * space the real section will occupy.
 */
const SKELETON_CARD_COUNT = 8;

/**
 * Landing-page "Hall of Fame" grid. Admin-driven: an admin adds
 * (name, institute, batch, photo) via /dashboard/success-students,
 * the row lands in the DB, and we render the live list here.
 *
 * The four fields displayed per card are exactly: image, name,
 * institute, batch. There is no achievement / grade line, no
 * badge, no year — the user explicitly asked for only those
 * four.
 *
 * Loading state: while the query is in-flight, render the same
 * section header + an 8-card grid of skeleton placeholders in the
 * same 4-col layout, so the page doesn't shift when the real
 * data arrives. Empty / error: the entire section is omitted
 * (no banners / no students → no fallback).
 */
const SuccessGallery = () => {
  const { data, isLoading, isError } = useGetSuccessStudentsQuery();
  const students: TSuccessStudent[] = data?.data ?? [];

  // Empty / error: omit the section entirely (no fallback).
  if (!isLoading && (isError || students.length === 0)) {
    return null;
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Our Successful Students
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real students. Real results. Get inspired by the faces of those who
            walked the same path you’re about to take.
          </p>
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4",
            // While loading, mark the grid as aria-busy so screen
            // readers know the placeholder cards are decorative.
            isLoading && "aria-busy:true",
          )}
          aria-busy={isLoading || undefined}
        >
          {isLoading
            ? // Skeleton cards — same 3:4 aspect ratio as real cards,
              // no text. The pulsing muted background gives the user
              // something to look at while the data loads.
              Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
                <Skeleton key={i} className="aspect-3/4 w-full rounded-2xl" />
              ))
            : students.map((student) => (
                <div
                  key={student.id}
                  className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-3/4">
                    <Image
                      src={student.imageUrl}
                      alt={student.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="text-sm font-semibold leading-tight">
                        {student.name}
                      </p>
                      <p className="text-xs text-white/85">
                        {student.institute}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/70">
                        {student.batch}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessGallery;
