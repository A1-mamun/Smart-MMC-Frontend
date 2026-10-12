"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Play,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useGetSettingsQuery,
  useGetInstructorSectionQuery,
  useRunExamAbsenceWarningNowMutation,
  useUpdateSettingsMutation,
  useUpdateInstructorSectionMutation,
} from "@/redux/features/settings/settings";
import {
  DEFAULT_INSTRUCTOR_SECTION,
  DEFAULT_SETTINGS_CONFIG,
  TExamAbsenceConfig,
  TInstructorStat,
  TSettingsConfig,
  TSettingsConfigPatch,
  TRunExamAbsenceWarningResult,
} from "@/types/settings";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { useAppSelector } from "@/redux/hooks";

/**
 * Deep diff: produce a flat TSettingsConfigPatch from a (draft, server)
 * pair. Top-level keys present in `draft` AND missing from `server`
 * (or different) are included; nested objects are walked.
 *
 * Only the exam-absence sub-config is user-tunable now — the absent-
 * warning feature is always-on, today-only, father-only and uses a
 * hardcoded message, so the Settings UI doesn't expose any of its
 * fields.
 */
const diffSettings = (
  draft: TSettingsConfig,
  server: TSettingsConfig,
): TSettingsConfigPatch => {
  const patch: Record<string, unknown> = {};

  const pushIfChanged = (
    key: keyof TSettingsConfigPatch,
    a: unknown,
    b: unknown,
  ) => {
    if (a !== b) patch[key as string] = a;
  };

  // exam-absence
  pushIfChanged(
    "examAbsenceEnabled",
    draft.examAbsence.enabled,
    server.examAbsence.enabled,
  );
  pushIfChanged(
    "examAbsenceDelayDays",
    draft.examAbsence.delayDays,
    server.examAbsence.delayDays,
  );
  pushIfChanged(
    "examAbsenceHour",
    draft.examAbsence.hour,
    server.examAbsence.hour,
  );
  pushIfChanged(
    "examAbsenceMinute",
    draft.examAbsence.minute,
    server.examAbsence.minute,
  );
  pushIfChanged(
    "examAbsenceMessage",
    draft.examAbsence.message,
    server.examAbsence.message,
  );

  return patch as TSettingsConfigPatch;
};

const SettingsPage = () => {
  const user = useAppSelector(useCurrentUser);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const [runExamAbsenceNow, { isLoading: isRunningExam }] =
    useRunExamAbsenceWarningNowMutation();

  // Instructor section — separate query + mutation pair, since
  // it lives under a different Setting row and a different
  // public/admin route pair. Same super-admin-only gate.
  const { data: instructorData, isLoading: isInstructorLoading } =
    useGetInstructorSectionQuery();
  const [updateInstructorSection, { isLoading: isInstructorSaving }] =
    useUpdateInstructorSectionMutation();
  const serverInstructorStats: TInstructorStat[] =
    instructorData?.data?.stats ?? DEFAULT_INSTRUCTOR_SECTION.stats;
  // `null` from the server = "no quote, omit the block". An
  // empty string in the form = "save as null" (clear). Anything
  // else is stored verbatim. We keep both stats and quote in
  // sibling local state because they're edited together but
  // server-merged separately on save.
  const serverInstructorQuote: string | null | undefined =
    instructorData?.data?.quote;

  // Local form state — kept in sync with the server-loaded
  // config so PATCH payloads always include only the diff the
  // admin actually touched. The instructor-section draft is a
  // sibling piece of state because the two settings have
  // independent round-trips.
  const [instructorStats, setInstructorStats] =
    useState<TInstructorStat[]>(serverInstructorStats);
  // Quote: seed with the front-end default so the Textarea is
  // never blank on first paint. Once the GET lands, a separate
  // effect (below) syncs to whichever value the server has
  // stored (including `null` for an admin-cleared quote).
  // Saving an empty Textarea posts `null` and clears the row.
  const [instructorQuote, setInstructorQuote] = useState<string>(
    serverInstructorQuote ?? DEFAULT_INSTRUCTOR_SECTION.quote ?? "",
  );
  const [hasSyncedInstructorQuote, setHasSyncedInstructorQuote] =
    useState<boolean>(serverInstructorQuote !== undefined);
  useEffect(() => {
    setInstructorStats(serverInstructorStats);
  }, [serverInstructorStats]);
  // Sync the quote only on the FIRST time the server responds,
  // or whenever the server-side value actually changes (e.g.
  // another admin updated it). Once the admin starts typing,
  // their in-flight edit wins — we don't want a stale cache
  // hit from another tab to clobber what they're writing.
  useEffect(() => {
    if (serverInstructorQuote === undefined) return;
    if (!hasSyncedInstructorQuote) {
      setInstructorQuote(serverInstructorQuote ?? "");
      setHasSyncedInstructorQuote(true);
      return;
    }
    // After first sync, only adopt server-side changes when
    // the local draft matches what we last saw — this means
    // "no unsaved admin edits", and we can safely overwrite.
    const lastSeen = serverInstructorQuote ?? "";
    if (instructorQuote === lastSeen) return;
    // Don't clobber an unsaved edit; do nothing. The
    // deep-equal diff below already accounts for divergence.
  }, [serverInstructorQuote, hasSyncedInstructorQuote, instructorQuote]);

  const isInstructorDirty = useMemo(
    () =>
      JSON.stringify(instructorStats) !== JSON.stringify(serverInstructorStats) ||
      instructorQuote !== (serverInstructorQuote ?? ""),
    [instructorStats, serverInstructorStats, instructorQuote, serverInstructorQuote],
  );

  // Add a fresh blank row at the end of the list. The "add"
  // button is disabled once we hit the server's max-6 cap so
  // the admin can't compose a payload the backend will reject.
  const addInstructorStat = () => {
    if (instructorStats.length >= 6) return;
    setInstructorStats((prev) => [...prev, { value: "", label: "" }]);
  };

  const removeInstructorStat = (index: number) => {
    setInstructorStats((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInstructorStatField = (
    index: number,
    field: keyof TInstructorStat,
    raw: string,
  ) => {
    setInstructorStats((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: raw } : row)),
    );
  };

  const handleSaveInstructor = async () => {
    // Defensive trim + drop empty rows so the admin can leave a
    // partially-filled blank row at the end of the list without
    // tripping the backend's "value/label required" check.
    const cleaned = instructorStats
      .map((s) => ({ value: s.value.trim(), label: s.label.trim() }))
      .filter((s) => s.value !== "" || s.label !== "");
    if (cleaned.length === 0) {
      toast.error("Add at least one stat before saving.");
      return;
    }
    // Quote semantics mirror the backend: a blank field here
    // means "clear the stored quote" — we send `null` so the
    // landing page omits the block. Anything non-empty is
    // stored verbatim (after a trim).
    const trimmedQuote = instructorQuote.trim();
    const quotePayload: string | null = trimmedQuote === "" ? null : trimmedQuote;
    try {
      await updateInstructorSection({
        stats: cleaned,
        quote: quotePayload,
      }).unwrap();
      toast.success("Instructor section saved.");
    } catch {
      toast.error("Failed to save instructor section.");
    }
  };

  const serverConfig = data?.data ?? DEFAULT_SETTINGS_CONFIG;

  // Local form state — kept in sync with the server-loaded config so
  // PATCH payloads always include only the diff the admin actually
  // touched.
  const [draft, setDraft] = useState<TSettingsConfig>(serverConfig);
  useEffect(() => {
    setDraft(serverConfig);
  }, [serverConfig]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(serverConfig),
    [draft, serverConfig],
  );

  // Convenience setter scoped to the only remaining sub-config. The
  // absent-warning sub-config is no longer user-editable from this page.
  const setExam = (patch: Partial<TExamAbsenceConfig>) =>
    setDraft((prev) => ({
      ...prev,
      examAbsence: { ...prev.examAbsence, ...patch },
    }));

  const handleSave = async () => {
    const patch = diffSettings(draft, serverConfig);
    if (Object.keys(patch).length === 0) {
      toast.info("No changes to save.");
      return;
    }
    try {
      await updateSettings(patch).unwrap();
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    }
  };

  const handleRunExamAbsence = async () => {
    try {
      const result = (await runExamAbsenceNow().unwrap())
        .data as TRunExamAbsenceWarningResult | null;
      if (!result) {
        toast.error("Run failed");
        return;
      }
      toast.success(
        `Exam-absence finished — sent ${result.sent}, skipped ${result.skipped}, matched ${result.total}.`,
      );
    } catch {
      toast.error("Run failed");
    }
  };

  const examEnabled = draft.examAbsence.enabled;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure system-wide SMS behaviour for exam-absence alerts. The
          absent-on-class warning is automatic — it runs once per day and sends
          an SMS to the student&apos;s father&apos;s mobile for any student who
          had class today but didn&apos;t attend.
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You can view the current settings but only a super admin can save
          changes. The &quot;Run now&quot; button below is available to all
          admins.
        </div>
      )}

      {/* ============ Card — exam-absence ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Exam-absence SMS to father</CardTitle>
          <CardDescription>
            When enabled, an SMS is sent to the student&apos;s father&apos;s
            mobile {draft.examAbsence.delayDays} day
            {draft.examAbsence.delayDays === 1 ? "" : "s"} after the exam, only
            if the examinee is still flagged absent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
              examEnabled ? "border-primary bg-primary/5" : "border-border"
            } ${!isSuperAdmin ? "opacity-80" : ""}`}
          >
            <div className="space-y-1">
              <Label htmlFor="examAbsenceEnabled" className="text-base">
                Send SMS to father after exam absence
              </Label>
              <p className="text-xs text-muted-foreground">
                Default OFF. When ON, the cron fires daily at the configured
                hour and minute; only examinees whose ExamResult.isAbsent is
                still true will be messaged.
              </p>
            </div>
            <Switch
              id="examAbsenceEnabled"
              checked={examEnabled}
              disabled={!isSuperAdmin}
              onCheckedChange={(v) => setExam({ enabled: v })}
            />
          </div>

          <fieldset
            disabled={!examEnabled || !isSuperAdmin}
            className="grid gap-4 md:grid-cols-4"
          >
            <div className="space-y-2">
              <Label htmlFor="examAbsenceDelayDays">Delay (days, 1-7)</Label>
              <Input
                id="examAbsenceDelayDays"
                type="number"
                min={1}
                max={7}
                value={draft.examAbsence.delayDays}
                onChange={(e) =>
                  setExam({
                    delayDays: Math.min(
                      7,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examAbsenceHour">Hour (0-23)</Label>
              <Input
                id="examAbsenceHour"
                type="number"
                min={0}
                max={23}
                value={draft.examAbsence.hour}
                onChange={(e) => setExam({ hour: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examAbsenceMinute">Minute (0-59)</Label>
              <Input
                id="examAbsenceMinute"
                type="number"
                min={0}
                max={59}
                value={draft.examAbsence.minute}
                onChange={(e) =>
                  setExam({ minute: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="examAbsenceMessage">
                Message template (max 1600 chars)
              </Label>
              <Textarea
                id="examAbsenceMessage"
                rows={4}
                maxLength={1600}
                value={draft.examAbsence.message}
                onChange={(e) => setExam({ message: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Placeholders: <code>{`{studentName}`}</code>,{" "}
                <code>{`{examTitle}`}</code>, <code>{`{examDate}`}</code>{" "}
                (YYYY-MM-DD). {draft.examAbsence.message.length} / 1600
                characters.
              </p>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      {/*
       * Instructor-section stats editor. Super-admin-only
       * because the headline numbers (e.g. "10+ Years Teaching",
       * "10000+ Students Mentored") are brand-level claims that
       * the standard admin shouldn't be able to edit. The public
       * landing page reads the same row via
       * /settings/public/instructor-section and 60s-caches it,
       * so saves show up for anonymous visitors within a minute.
       */}
      <Card>
        <CardHeader>
          <CardTitle>Instructor section stats</CardTitle>
          <CardDescription>
            The headline numbers shown on the public landing page next to the
            lead-instructor bio (e.g. &quot;10+ Years Teaching&quot;,
            &quot;10000+ Students Mentored&quot;). Up to 6 stats. Order in this
            list is the order on the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isInstructorLoading ? (
            <p className="text-sm text-muted-foreground">Loading stats…</p>
          ) : (
            <>
              <div
                className={`grid gap-3 ${
                  !isSuperAdmin ? "opacity-80 pointer-events-none" : ""
                }`}
              >
                {instructorStats.map((stat, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[120px_1fr_auto] sm:items-end"
                  >
                    <div className="space-y-1">
                      <Label
                        htmlFor={`instructor-stat-value-${index}`}
                        className="text-xs"
                      >
                        Value
                      </Label>
                      <Input
                        id={`instructor-stat-value-${index}`}
                        placeholder="10+"
                        value={stat.value}
                        disabled={!isSuperAdmin}
                        onChange={(e) =>
                          updateInstructorStatField(
                            index,
                            "value",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`instructor-stat-label-${index}`}
                        className="text-xs"
                      >
                        Label
                      </Label>
                      <Input
                        id={`instructor-stat-label-${index}`}
                        placeholder="Years Teaching"
                        value={stat.label}
                        disabled={!isSuperAdmin}
                        onChange={(e) =>
                          updateInstructorStatField(
                            index,
                            "label",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!isSuperAdmin}
                      onClick={() => removeInstructorStat(index)}
                      aria-label={`Remove stat ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isSuperAdmin || instructorStats.length >= 6}
                  onClick={addInstructorStat}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add stat
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({instructorStats.length}/6)
                  </span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    !isSuperAdmin ||
                    !isInstructorDirty ||
                    isInstructorSaving
                  }
                  onClick={handleSaveInstructor}
                >
                  {isInstructorSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save instructor stats
                </Button>
              </div>

              {/*
               * Pull-quote editor. Same save button as the
               * stats (we send both fields in one PATCH so the
               * admin never has to coordinate two separate
               * saves). Clear semantics: an empty Textarea
               * stores `null` and the landing page then omits
               * the quote block. The character cap mirrors the
               * backend Zod schema (max 500).
               */}
              <div className="mt-2 space-y-2">
                <Label htmlFor="instructorQuote" className="text-sm">
                  Pull-quote (optional, max 500 chars)
                </Label>
                <Textarea
                  id="instructorQuote"
                  rows={3}
                  maxLength={500}
                  placeholder="Leave blank to hide the quote block on the landing page."
                  value={instructorQuote}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setInstructorQuote(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown under the lead-instructor name on the
                  public landing page. Leave blank to hide the
                  block entirely. {instructorQuote.length} / 500
                  characters.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSave}
          disabled={!isSuperAdmin || !isDirty || isSaving || isLoading}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save settings
        </Button>
        {/* <Button
          variant="outline"
          onClick={handleRunExamAbsence}
          disabled={isRunningExam}
        >
          {isRunningExam ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run exam-absence job now
        </Button> */}
      </div>
    </div>
  );
};

export default SettingsPage;
