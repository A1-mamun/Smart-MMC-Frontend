"use client";

import Image from "next/image";
import {
  Atom,
  Calculator,
  GraduationCap,
  Quote,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { courseNames } from "@/constants/courseNames";
import {
  DEFAULT_INSTRUCTOR_SECTION,
  TInstructorStat,
} from "@/types/settings";
import { useGetInstructorSectionQuery } from "@/redux/features/settings/settings";
import teacherImage from "public/images/teacher-mmc.jpeg";

/**
 * Pick a Lucide icon for each course so the bullet grid has
 * visual variety. Mapped by course value (not label) so the
 * icon stays stable if the human label is later re-worded.
 *
 * - HSC 1st / 2nd Year → atom (foundational science)
 * - HSC Final Preparation → graduation cap (board-prep)
 * - Advanced Admission → sparkles (premium / honours track)
 * - Engineering & Varsity → wrench (engineering / technical)
 */
const COURSE_ICONS: Record<(typeof courseNames)[number]["value"], typeof Atom> =
  {
    HSC_1ST_YEAR: Atom,
    HSC_2ND_YEAR: Calculator,
    HSC_FINAL_PREPARATION: GraduationCap,
    ADVANCED_ADMISSION: Sparkles,
    ENGINEERING_AND_VARSITY_ADMISSION: Wrench,
  };

const InstructorSection = () => {
  /*
   * The headline stats (e.g. "10+ Years Teaching") are
   * super-admin-editable via /dashboard/settings. The public
   * endpoint is unauthenticated and 60s-cached, so anonymous
   * visitors see fresh numbers without us shipping an auth
   * round-trip on every page load. While the GET is in-flight
   * we fall back to the same default set the backend uses —
   * keeps the page from jumping once the response lands.
   *
   * Same shape applies to the optional pull-quote: the server
   * normalises an empty / cleared quote to `null`, so a
   * non-empty string = "render the block", anything else =
   * "omit entirely". No half-states.
   */
  const { data, isLoading, isError } = useGetInstructorSectionQuery();
  const stats: TInstructorStat[] =
    data?.data?.stats ?? DEFAULT_INSTRUCTOR_SECTION.stats;
  const serverQuote: string | null | undefined = data?.data?.quote;
  // On first paint we lean on the front-end default copy so
  // the section never flashes an empty quote block while the
  // GET is in-flight. Once the response lands we use whatever
  // the server returns — if the admin cleared the quote, the
  // block disappears entirely. A missing `quote` field on the
  // server response is treated identically to `null`.
  const quote: string | null =
    serverQuote === undefined
      ? DEFAULT_INSTRUCTOR_SECTION.quote ?? null
      : serverQuote;

  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <GraduationCap className="h-3.5 w-3.5" />
            Meet Your Mentor
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Learn from the Best
          </h2>
          <p className="mt-3 text-muted-foreground">
            One passionate teacher. One clear vision. Endless success stories.
          </p>
        </div>

        <Card className="overflow-hidden border-2">
          <CardContent className="grid gap-8 p-0 md:grid-cols-5">
            <div className="md:col-span-3 p-6 sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Lead Instructor &amp; Founder
              </p>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
                Engr. Mohd Mehedi Hasan
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                BSc in CSE · RUET
              </p>

              {/*
               * Optional pull-quote under the lead-instructor
               * name. Rendered ONLY when the server returns a
               * non-empty string — a `null` / `""` / missing
               * value from the API means "no quote", and we
               * omit the whole block so the layout collapses
               * cleanly. No trailing empty card, no zero-height
               * padding box.
               */}
              {quote ? (
                <div className="mt-6 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                  <Quote className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm italic text-muted-foreground">
                    {quote}
                  </p>
                </div>
              ) : null}

              {/*
               * Course offerings as a bullet grid. Sourced from
               * the central `courseNames` constant so adding a new
               * course to the catalog automatically surfaces it
               * here — no second place to update. Five items on a
               * 2-col grid leaves a single empty cell; we let it
               * flow naturally rather than adding a dummy item.
               */}
              <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                {courseNames.map((course) => {
                  const Icon = COURSE_ICONS[course.value] ?? GraduationCap;
                  return (
                    <li
                      key={course.value}
                      className="flex items-center gap-2 font-semibold"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {course.label}
                    </li>
                  );
                })}
              </ul>

              {/*
               * Headline stats — fetched from
               * GET /settings/public/instructor-section. The
               * super admin can edit the list (value + label
               * per stat, up to 6 entries) on the Settings
               * page; the public endpoint serves the result.
               * Skeleton is rendered only on the very first
               * load — once the default fallback is in place
               * the section never blanks out, even on a
               * network blip.
               */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {isLoading && !data
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border bg-background p-4 text-center"
                      >
                        <Skeleton className="mx-auto h-7 w-16" />
                        <Skeleton className="mx-auto mt-2 h-3 w-24" />
                      </div>
                    ))
                  : stats.map((stat) => (
                      <div
                        key={`${stat.value}-${stat.label}`}
                        className="rounded-xl border bg-background p-4 text-center"
                      >
                        <div className="text-2xl font-bold text-primary">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-xs font-medium text-muted-foreground">
                          {stat.label}
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            <div className="relative h-72 md:col-span-2 md:h-auto">
              <Image
                src={teacherImage}
                alt="Mohd Mehedi Hasan"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover object-top"
              />
              {/* <div className="absolute inset-0 bg-linear-to-tr from-primary/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                <span>4.9 · Rated by guardians</span>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default InstructorSection;
