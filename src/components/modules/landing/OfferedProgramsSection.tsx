import {
  Atom,
  Calculator,
  GraduationCap,
  Sparkles,
  Wrench,
  BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { courseNames } from "@/constants/courseNames";
import type { LucideIcon } from "lucide-react";

/**
 * Per-course metadata for the "Offered Programs" section on
 * the public landing page. The course name itself is sourced
 * from the central `courseNames` constant (mirrors the backend
 * `CourseName` enum) so adding a new program to the catalog
 * automatically surfaces it here — we only need to add one
 * entry below.
 *
 * Smart MMC is dedicated to **HSC Mathematics only** — every
 * program here is a math track. The five "courses" in the
 * catalog describe student-year/admission-intent levels, not
 * different subjects. We surface them as five distinct tracks
 * so a visitor can quickly find the program that matches
 * where they are in their HSC journey.
 *
 *   - `Icon`    — a Lucide icon for visual variety. Same
 *                 iconography used in the InstructorSection
 *                 course bullet list.
 *   - `chip`    — short label rendered above the title (e.g.
 *                 "Year 1", "Board Prep", "Admission").
 *   - `chipTone`— Badge variant used for the chip. `default` =
 *                 primary brand colour; `secondary` = muted
 *                 slate; `outline` = neutral border.
 *   - `blurb`   — 1–2 sentence marketing copy. Kept short on
 *                 purpose: visitors scan, they don't read.
 *                 Hardcoded here (not on the backend) because
 *                 the wording rarely changes and a deploy
 *                 round-trip shouldn't be required to fix a
 *                 typo.
 *
 * Order of the keys here = order on the page. 3-col grid on
 * `lg+` collapses to 2-col on `md` and 1-col on mobile; the 5th
 * card sits alone on the second row, which is intentional —
 * it gives the section visual weight without forcing a 5-col
 * layout that wouldn't fit narrower screens.
 */
type TProgramMeta = {
  Icon: LucideIcon;
  chip: string;
  chipTone: "default" | "secondary" | "outline";
  blurb: string;
};

const PROGRAMS: Record<(typeof courseNames)[number]["value"], TProgramMeta> = {
  HSC_1ST_YEAR: {
    Icon: Atom,
    chip: "HSC · Year 1",
    chipTone: "default",
    blurb:
      "Build a rock-solid foundation in HSC Mathematics — sets, functions, trigonometry, coordinate geometry and the calculus basics. Designed for first-year students who want to stay ahead of the syllabus from week one.",
  },
  HSC_2ND_YEAR: {
    Icon: Calculator,
    chip: "HSC · Year 2",
    chipTone: "default",
    blurb:
      "Take on differentiation, integration, complex numbers, vectors and matrices with weekly problem-solving sessions, chapter-wise model tests and one-on-one feedback on every homework set.",
  },
  HSC_FINAL_PREPARATION: {
    Icon: GraduationCap,
    chip: "Board Prep",
    chipTone: "secondary",
    blurb:
      "Crash-course-style revision for the HSC board exam. Past-paper drills chapter-by-chapter, time-management drills, and full-length model tests under exam conditions.",
  },
  ADVANCED_ADMISSION: {
    Icon: Sparkles,
    chip: "Admission",
    chipTone: "outline",
    blurb:
      "University admission test preparation — focused on the highest-weightage HSC math topics and the speed-accuracy trade-off that wins ranks in honours and medical tracks.",
  },
  ENGINEERING_AND_VARSITY_ADMISSION: {
    Icon: Wrench,
    chip: "Engineering",
    chipTone: "outline",
    blurb:
      "BUET, CUET, RUET, KUET and other engineering-university admission tracks. Deep coverage of the calculus, algebra and coordinate-geometry problem sets that show up year after year.",
  },
};

/**
 * Public landing-page "Offered Programs" section. Renders a
 * card per program in the catalog, using the central
 * `courseNames` constant as the source of truth for which
 * programs exist. The card body is purely presentational — no
 * data fetching, no `"use client"` — so the section ships
 * zero JavaScript and the cards are part of the first paint.
 *
 * Visual: matches the rest of the landing page (centered
 * header pill, muted background, `py-20` vertical rhythm). The
 * 3-col grid means a 5th card sits alone on row 2 by design;
 * we don't fake a 6th entry to fill the row.
 */
const OfferedProgramsSection = () => {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Offered Programs
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            HSC Mathematics, end to end.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Smart MMC is dedicated to HSC Mathematics only — nothing else.
            Pick the track that matches where you are in your HSC journey and
            we&apos;ll meet you there with a clear curriculum, a predictable
            schedule, and a teacher who actually knows your name.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courseNames.map((course) => {
            const meta = PROGRAMS[course.value];
            // Defensive: if a new program is added to the
            // backend enum but someone forgets to add a meta
            // entry here, fall back to a neutral icon + chip
            // rather than crashing the page. The course label
            // still renders from `courseNames`.
            const Icon = meta?.Icon ?? BookOpen;
            return (
              <Card
                key={course.value}
                className="h-full overflow-hidden border-2 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {meta?.chip ? (
                      <Badge
                        variant={meta.chipTone}
                        className="uppercase tracking-wider"
                      >
                        {meta.chip}
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="text-xl font-semibold tracking-tight">
                    {course.label}
                  </h3>

                  {/*
                   * Blurb is a marketing line, not a feature
                   * list — the per-card description on the
                   * /batches page covers the detail (schedule,
                   * fee, seat count). Here we're selling the
                   * program, so the copy is short and
                   * benefit-led.
                   */}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {meta?.blurb ??
                      "A focused program designed to help you master the syllabus, build exam confidence, and reach your target."}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OfferedProgramsSection;
