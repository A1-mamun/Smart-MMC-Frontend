"use client";

import { useEffect, useState } from "react";
import { Search, X, Users, Phone, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import type { TStudent } from "@/types/student";
import type { TSmsRecipient } from "@/types/sms";
import { formatBatchLabel, formatBatchDayLabel } from "@/constants/labels";
import QuickScenarioFilters, {
  EMPTY_SCENARIO,
  type QuickScenarioState,
} from "./QuickScenarioFilters";

/**
 * Which mobile the picker should attach to each recipient. The
 * absent-warning flow is locked to the father (per spec), so the
 * picker forces the choice in that mode — see the locked-state
 * logic in `effectiveRecipientType` below.
 */
export type TRecipientType = "student" | "guardian";

/**
 * Decide which mobile to send to for a given student. The
 * absent-warning flow overrides everything and forces the
 * father's number (per spec — no mother / self fallback).
 */
const pickMobile = (
  s: TStudent,
  recipientType: TRecipientType,
  absentOnDate: string,
): string => {
  if (absentOnDate) return s.fatherMobile || "";
  return recipientType === "guardian" ? s.fatherMobile || "" : s.mobile;
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
  // The picker is fully controlled: `selected` is read straight from the
  // parent's `initial` prop and every mutation just calls `onChange(next)`.
  // We deliberately avoid a parallel `useState` here because dual sources
  // of truth can drift across renders (e.g. when the student list refetches
  // after a filter change). All counts in the picker header, the SmsPage
  // summary card, and the Send button therefore reflect the same array.
  const selected = initial;
  // Quick-scenario state (date / status / course / batch day / time /
  // due / absent). Course / batch day / time cascade inside
  // `QuickScenarioFilters` (status → course → batch day → time), and
  // everything is additive with the free-text search above.
  const [scenario, setScenario] = useState<QuickScenarioState>(EMPTY_SCENARIO);
  // Which mobile the picker attaches to each recipient. Defaults
  // to "student" so routine SMS go to the student themselves;
  // when the absent-warning filter is set, the auto-flip effect
  // below switches this to "guardian" (the father) because the
  // spec mandates father-only delivery for that flow. The user
  // can still flip it back manually — see `effectiveRecipientType`
  // below for the locked-state override.
  const [recipientType, setRecipientType] = useState<TRecipientType>("student");
  // Absent-warning mode is father-only by spec, so we override
  // the user's switch pick and force the type to "guardian".
  // The radio UI also reflects this locked state.
  const effectiveRecipientType: TRecipientType = scenario.absentOnDate
    ? "guardian"
    : recipientType;
  // Auto-flip the recipient type to "guardian" the moment the
  // admin sets an absent-warning date. Skips the update if we're
  // already on guardian so we don't churn React state, and skips
  // the update when the user CLEARS the date (the user
  // explicitly opted back into student-side messaging — we
  // respect that rather than snapping back to student).
  useEffect(() => {
    if (scenario.absentOnDate && recipientType !== "guardian") {
      setRecipientType("guardian");
    }
    // `recipientType` is intentionally NOT in deps — we only
    // want to react to the absentOnDate transition, not to our
    // own setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.absentOnDate]);

  const { data: studentsData, isFetching } = useGetAllStudentsQuery(
    {
      ...(search ? { searchTerm: search } : {}),
      ...(scenario.classDate ? { classDate: scenario.classDate } : {}),
      ...(scenario.classTime ? { classTime: scenario.classTime } : {}),
      ...(scenario.scenarioCourse
        ? { scenarioCourses: scenario.scenarioCourse }
        : {}),
      ...(scenario.scenarioBatchDay
        ? { batchDayId: scenario.scenarioBatchDay }
        : {}),
      ...(scenario.scenarioCourseStatus
        ? { courseStatus: scenario.scenarioCourseStatus }
        : {}),
      ...(scenario.hasDue ? { hasDue: true } : {}),
      ...(scenario.absentOnDate ? { absentOnDate: scenario.absentOnDate } : {}),
      limit: 500,
    },
    { refetchOnMountOrArgChange: true },
  );
  const students = studentsData?.data || [];

  // When the admin flips the recipient-type switch (or the
  // scenario pins us to "guardian" for absent-warning), re-map
  // every already-selected recipient's mobile so the SMS goes
  // to the right number. Without this, the old mobile would
  // linger on each selected student and a send would deliver
  // to the wrong person. We skip the update if nothing changed
  // (the user just toggled the switch back) so we don't churn
  // the parent on every render.
  useEffect(() => {
    if (selected.length === 0) return;
    const byId = new Map(students.map((s) => [s.id, s] as const));
    const next = selected.map((r) => {
      const s = byId.get(r.studentId);
      if (!s) return r; // student no longer in the visible cohort — leave as-is
      const desiredMobile = pickMobile(
        s,
        effectiveRecipientType,
        scenario.absentOnDate,
      );
      return r.mobile === desiredMobile ? r : { ...r, mobile: desiredMobile };
    });
    const changed = next.some((r, i) => r !== selected[i]);
    if (changed) onChange(next);
    // We intentionally depend on `effectiveRecipientType` and
    // `scenario.absentOnDate` (the inputs to `pickMobile`).
    // `selected` is the parent's prop, not a local — including
    // it in deps would cause an infinite loop because the
    // effect calls `onChange` which mutates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRecipientType, scenario.absentOnDate, students]);

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
              mobile: pickMobile(
                s,
                effectiveRecipientType,
                scenario.absentOnDate,
              ),
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

          {/*
            The Course / Batch day / Time selects that used to live
            here have been merged into the Quick-scenarios card
            below (see `QuickScenarioFilters`). The cascade there
            also threads in Course status, which the old
            standalone top filter didn't expose. The free-text
            search remains the only top-of-picker control.
          */}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <QuickScenarioFilters value={scenario} onChange={setScenario} />

        {/*
          Recipient-type picker. Two labelled switch cards, mutually
          exclusive — only one is "on" at a time. Student sends to
          the student's own mobile, guardian (default for the
          absent-warning flow) sends to the father's mobile. The
          father's number is what the absent-warning spec mandates
          anyway, so the switches are locked to "Guardian" when
          `absentOnDate` is set (both visually disabled and the
          internal `effectiveRecipientType` pinned).
        */}
        <div
          className={`rounded-md border bg-background p-3 space-y-2 ${
            scenario.absentOnDate ? "opacity-70" : ""
          }`}
          aria-disabled={!!scenario.absentOnDate}
        >
          <Label className="text-xs">Send to</Label>
          {/*
            Native radio-group instead of nested buttons + Switch.
            Each option is a `<label>` containing a hidden radio
            input — clicking the whole card flips the input, which
            fires React's `onChange`. No `<button>` descendant of
            another `<button>`, and the browser gives us the
            correct "mutually exclusive choice" semantics for
            screen readers via `role="radiogroup"`.
          */}
          <div
            className="grid gap-2 md:grid-cols-2"
            role="radiogroup"
            aria-label="Recipient type"
          >
            <label
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors cursor-pointer ${
                effectiveRecipientType === "student"
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40"
              } ${scenario.absentOnDate ? "cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium leading-none">Student</p>
                  <p className="text-xs text-muted-foreground">
                    Use the student's own mobile
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="recipient-type"
                value="student"
                checked={effectiveRecipientType === "student"}
                disabled={!!scenario.absentOnDate}
                onChange={() => setRecipientType("student")}
                className="h-4 w-4 accent-primary"
                aria-label="Send to student's mobile"
              />
            </label>
            <label
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors cursor-pointer ${
                effectiveRecipientType === "guardian"
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40"
              } ${scenario.absentOnDate ? "cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium leading-none">Guardian</p>
                  <p className="text-xs text-muted-foreground">
                    Use the father's mobile
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="recipient-type"
                value="guardian"
                checked={effectiveRecipientType === "guardian"}
                disabled={!!scenario.absentOnDate}
                onChange={() => setRecipientType("guardian")}
                className="h-4 w-4 accent-primary"
                aria-label="Send to guardian's mobile"
              />
            </label>
          </div>
          {scenario.absentOnDate && (
            <p className="text-xs text-muted-foreground">
              Absent-warning flow auto-switches to the guardian's mobile (father
              only, no mother / self fallback).
            </p>
          )}
        </div>

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
                          mobile: pickMobile(
                            s,
                            effectiveRecipientType,
                            scenario.absentOnDate,
                          ),
                        })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{s.user.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {/* Mobile is the per-account identifier now; */}
                        {s.user.mobile} · {s.mobile}
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
