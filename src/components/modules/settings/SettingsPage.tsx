"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Play,
  Settings as SettingsIcon,
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
  useRunExamAbsenceWarningNowMutation,
  useUpdateSettingsMutation,
} from "@/redux/features/settings/settings";
import {
  DEFAULT_SETTINGS_CONFIG,
  TExamAbsenceConfig,
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
    setDraft((prev) => ({ ...prev, examAbsence: { ...prev.examAbsence, ...patch } }));

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
          absent-on-class warning is automatic — it runs once per day and
          sends an SMS to the student&apos;s father&apos;s mobile for any
          student who had class today but didn&apos;t attend.
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
                onChange={(e) =>
                  setExam({ hour: Number(e.target.value) || 0 })
                }
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
                onChange={(e) =>
                  setExam({ message: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Placeholders: <code>{`{studentName}`}</code>,{" "}
                <code>{`{examTitle}`}</code>,{" "}
                <code>{`{examDate}`}</code> (YYYY-MM-DD).{" "}
                {draft.examAbsence.message.length} / 1600 characters.
              </p>
            </div>
          </fieldset>
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
        <Button
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
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
