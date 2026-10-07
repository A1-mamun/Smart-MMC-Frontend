"use client";
import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Power,
  X,
  CheckCircle2,
  Sparkles,
  Unlock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCourseMutation,
  useDeleteCourseMutation,
  useGetAllCoursesQuery,
  useSetCourseStatusMutation,
  useSetSlotWindowOverrideMutation,
  useToggleAdmitAnotherCourseMutation,
  useToggleBatchSlotMutation,
  useToggleCourseActiveMutation,
  useUpdateCourseMutation,
} from "@/redux/features/course/course";
import { TCourse, TCourseStatus } from "@/types/student";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { MultiSelect } from "@/components/ui/multiselect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller, useFieldArray, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { courseNames } from "@/constants/courseNames";
import { hscBatches } from "@/constants/batches";
import { formatBatchLabel, formatCourseLabel } from "@/constants/labels";

const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

/**
 * Convert total minutes to "h:mm" form (e.g. 75 → "1:15", 90 →
 * "1:30"). Used by the duration input's "minutes → display" branch
 * and by the kiosk's duration pill. Pure helper — no React
 * dependencies so it lives at module scope.
 */
const minutesToHm = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Convert an "h:mm" string (e.g. "1:15", "0:45", "2:00") to total
 * minutes. Returns `null` on malformed input so the form's
 * Controller-validate path returns a clear error instead of
 * silently sending `NaN`. We cap the value at 600 (10h) so the
 * input doesn't accept out-of-range durations; the form's Zod
 * schema will surface a friendly error before it ever reaches
 * the backend.
 */
const hmToMinutes = (raw: string): number | null => {
  const m = raw.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours < 0 || hours > 10) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const DAY_OPTIONS = [
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
];

const batchDayFormSchema = z.object({
  // Optional id — when editing a course we send the existing BatchDay id
  // back so the backend can update that row in place instead of deleting
  // and recreating it (which would orphan StudentBatch.batchDayId FKs).
  id: z.string().optional(),
  name: z.string().trim().min(1, "Batch day name is required").max(50),
  days: z
    .array(z.string().trim().min(1))
    .min(1, "At least one day is required"),
  times: z
    .array(
      z
        .string()
        .trim()
        .regex(timeRegex, 'Time must be like "7:00 AM" or "4:30 PM"'),
    )
    .min(1, "Add at least one time"),
  // Per-batch class duration in total minutes. Drives the kiosk's
  // live progress bar / countdown AND feeds the schedule-conflict
  // checker (a `null` duration would silently skip overlap checks
  // against other slots in the same window).
  //
  // Required on create — every fresh course must declare how long
  // its classes run. The field defaults to 60 (1h) on the form via
  // the RHF `defaultValues`, and `DurationField` is wired so the
  // displayed value is pushed into RHF state on mount (the previous
  // implementation only rendered "1:00" visually but never registered
  // it, so creates were silently saving `null`).
  durationMinutes: z
    .coerce
    .number()
    .int('Duration must be a whole number of minutes')
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration cannot exceed 10 hours (600 min)'),
});

const schema = z.object({
  name: z.enum([
    "HSC_1ST_YEAR",
    "HSC_2ND_YEAR",
    "HSC_FINAL_PREPARATION",
    "ADMISSION",
  ]),
  fee: z.number().min(0, "Fee must be positive"),
  description: z.string().optional(),
  hscBatch: z.enum(["BATCH_25", "BATCH_26", "BATCH_27", "BATCH_28"]),
  // Per-course seat cap. Required — every fresh course must
  // declare how many students each (batchDay, batchTime) slot
  // admits. min(1) blocks the "0 seats = nobody allowed"
  // footgun; use the active toggle for that intent. The
  // <Input type="number"> on the form is constrained to the
  // same 1..10000 range, so a blank submission is rejected by
  // Zod's min(1) with a clear error.
  //
  // The DB column stays nullable for backward compat with
  // legacy rows whose totalSeats is null — those still render
  // the "Uncapped" badge on the Courses card. New courses can
  // no longer land in that state; the form has no "leave empty
  // for uncapped" affordance anymore.
  totalSeats: z.coerce
    .number()
    .int("Seat cap must be a whole number")
    .min(1, "Seat cap must be at least 1")
    .max(10000, "Seat cap cannot exceed 10,000"),
  batchDays: z
    .array(batchDayFormSchema)
    .min(1, "Add at least one batch day")
    .max(7, "Maximum 7 batch days per course"),
});

type FormData = z.infer<typeof schema>;

function ChipsEditor({
  values,
  onChange,
  placeholder,
  validate,
  hint,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  validate?: (v: string) => string | null;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (validate) {
      const err = validate(v);
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (values.includes(v)) {
      toast.error("Already added");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2 mt-1">
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Two-input duration editor. Lets the admin type "1:15" or "2:00"
 * (hours:minutes, with minutes always two digits) instead of
 * asking them to compute the total minutes in their head. We keep
 * the hours and minutes in separate inputs so a partial edit
 * (e.g. typing a new minute) doesn't accidentally reformat the
 * hours. The combined value is parsed by `hmToMinutes` on each
 * keystroke; if it doesn't parse we send `undefined` so the form's
 * Zod schema raises a clear validation error.
 *
 * The mount effect below is the fix for the "duration isn't saved"
 * bug: before this change, the inputs always rendered with `1:00`
 * on a fresh form, but `recompute(...)` was never called, so
 * RHF's `durationMinutes` stayed at its declared default (`undefined`)
 * — and the submit handler coerced that to `null`. The backend then
 * stored `null`, the field never made it to the DB. We now call
 * `recompute(...)` once on mount so the displayed value lands in
 * RHF state.
 */
const DurationField = ({
  value,
  onChange,
}: {
  value: number | undefined | null;
  // Always emits a positive integer in 1..600 (enforced by the
  // form's Zod schema). We never need to push `undefined` —
  // the schema rejects it, so the user-visible path is
  // either a valid number or a form-level validation error.
  onChange: (next: number) => void;
}) => {
  // Initial state — derive h/m from the current value. Falls back
  // to "1:00" (the legacy default) when the admin has never set
  // a duration, so the input is always populated and parseable.
  const initial = value === undefined || value === null ? "" : minutesToHm(value);
  const [hours, setHours] = useState<string>(
    initial ? initial.split(":")[0] : "1",
  );
  const [minutes, setMinutes] = useState<string>(
    initial ? initial.split(":")[1] : "00",
  );

  // Re-sync local state when the upstream `value` changes (e.g. the
  // admin opens the edit modal for a different course). This keeps
  // the inputs in sync with the React Hook Form state without us
  // having to feed every keystroke back into RHF.
  useEffect(() => {
    const next = value === undefined || value === null ? "" : minutesToHm(value);
    if (!next) return;
    const [h, m] = next.split(":");
    setHours(h);
    setMinutes(m);
  }, [value]);

  const recompute = (h: string, m: string) => {
    const composed = `${h}:${String(m).padStart(2, "0")}`;
    const total = hmToMinutes(composed);
    // Parse failure means the user typed something that doesn't
    // form a valid `h:mm` — bail at the form's last valid value
    // (60) so the Zod `min(1)` validator surfaces a clear error
    // instead of the user getting a stuck-on-`60` field after a
    // bad edit. Sending `60` here is also the safety floor the
    // mount effect relies on (a fresh form mounts with `60`).
    onChange(total ?? 60);
  };

  // Push the initial displayed value into RHF on mount. We only
  // fire when the upstream `value` is missing/null — if the admin
  // is editing a course that already has a real duration we trust
  // the upstream value and don't want to clobber it with a
  // redundant recompute (which would be a no-op for valid inputs
  // but could overwrite transient edits in some RHF edge cases).
  // The `recompute(...)` call uses the current local `hours` /
  // `minutes` state, so the value we send matches what the user
  // sees on screen.
  useEffect(() => {
    if (value === undefined || value === null) {
      recompute(hours, minutes);
    }
    // Intentionally run once on mount. We deliberately don't
    // include `recompute` in deps — `recompute` is a fresh closure
    // every render and depending on it would loop. The mount-only
    // guard is enforced by the `value === undefined || value ===
    // null` check (the field's upstream value becomes defined as
    // soon as `recompute` fires, so the effect short-circuits on
    // re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={10}
          step={1}
          value={hours}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
            setHours(next);
            recompute(next, minutes);
          }}
          className="w-16 text-center font-mono"
          aria-label="Class duration hours"
        />
        <span className="text-muted-foreground font-mono">:</span>
        <Input
          type="number"
          min={0}
          max={59}
          step={5}
          value={minutes}
          onChange={(e) => {
            // Clamp minutes to 0-59 — the underlying input has max=59
            // but pasting / typing can bypass it; the clamp is a
            // belt-and-suspenders safety net.
            const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
            const clamped = Math.min(59, Number(raw) || 0);
            const next = String(clamped).padStart(2, "0");
            setMinutes(next);
            recompute(hours, next);
          }}
          className="w-16 text-center font-mono"
          aria-label="Class duration minutes"
        />
      </div>
      <span className="text-xs text-muted-foreground">
        h : mm
      </span>
    </div>
  );
};

const CoursesPage = () => {
  const { data, isLoading, refetch } = useGetAllCoursesQuery({ limit: 100 });
  const [createCourse] = useCreateCourseMutation();
  const [updateCourse] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [toggleActive, { isLoading: toggling }] =
    useToggleCourseActiveMutation();
  const [toggleSlot, { isLoading: togglingSlot }] =
    useToggleBatchSlotMutation();
  const [setSlotWindow, { isLoading: settingSlotWindow }] =
    useSetSlotWindowOverrideMutation();
  const [setStatus, { isLoading: settingStatus }] =
    useSetCourseStatusMutation();
  const [toggleAdmit, { isLoading: togglingAdmit }] =
    useToggleAdmitAnotherCourseMutation();
  const [editing, setEditing] = useState<TCourse | null>(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TCourseStatus>("ADMISSION");
  // Custom confirmation modal — replaces the blocking `window.confirm()`
  // for destructive row actions so the warning matches the dashboard's
  // design tokens and stays keyboard-accessible.
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirmDialog();

  const allCourses = data?.data || [];
  // Three primary tabs — one per lifecycle stage. The lifecycle status
  // is the main axis the admin thinks along ("which batch is admitting
  // new students, which is in flight, which has graduated"); the
  // isActive toggle is orthogonal and surfaced per-card as a separate
  // badge + control.
  const admissionCourses = allCourses.filter(
    (c) => (c.status ?? "ADMISSION") === "ADMISSION",
  );
  const ongoingCourses = allCourses.filter((c) => c.status === "ONGOING");
  const completeCourses = allCourses.filter((c) => c.status === "COMPLETE");
  // Cross-cutting counts surfaced in the header subtitle. The
  // inactive count is the difference between all courses and the
  // active ones — pausing a course via the Power button just flips
  // isActive, it doesn't move the course between status tabs.
  const activeCount = allCourses.filter((c) => c.isActive).length;
  const displayedCourses =
    activeTab === "ADMISSION"
      ? admissionCourses
      : activeTab === "ONGOING"
      ? ongoingCourses
      : activeTab === "COMPLETE"
      ? completeCourses
      : admissionCourses;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema) as Resolver<FormData, any, FormData>,
    defaultValues: {
      name: "HSC_1ST_YEAR",
      fee: 0,
      description: "",
      hscBatch: "BATCH_27",
      totalSeats: 120,
      batchDays: [{ name: "", days: [], times: [], durationMinutes: 60 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "batchDays",
  });

  const watchedDays = useWatch({ control, name: "batchDays" });

  const onSubmit = async (formData: FormData) => {
    try {
      const cleaned = {
        ...formData,
        // totalSeats is now required (1..10000). Coerce through
        // Number() to defend against string inputs leaking
        // through a paste / autofill. Empty submissions are
        // rejected upstream by Zod's min(1), so by the time
        // we reach this branch the value is always a
        // positive integer.
        totalSeats: Number(formData.totalSeats),
        batchDays: formData.batchDays.map((d) => ({
          // Preserve the existing batchDay id during an update so the backend
          // can match and update that row in place (preserving
          // StudentBatch.batchDayId FKs). New rows leave id undefined.
          id: d.id,
          name: d.name.trim(),
          days: d.days,
          times: d.times,
          // Duration: always a positive integer between 1 and 600
          // (enforced by the form's Zod schema). Coerce through
          // Number() to defend against string inputs leaking
          // through a paste / autofill, then send the integer
          // straight to the backend.
          durationMinutes: Number(d.durationMinutes),
        })),
      };
      if (editing) {
        await updateCourse({ id: editing.id, data: cleaned }).unwrap();
        toast.success("Course updated");
      } else {
        await createCourse(cleaned).unwrap();
        toast.success("Course created");
      }
      setOpen(false);
      setEditing(null);
      reset();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  const handleEdit = (course: TCourse) => {
    setEditing(course);
    reset({
      name: course.name,
      fee: Number(course.fee),
      description: course.description || "",
      hscBatch: course.hscBatch,
      // Carry the existing totalSeats through to the form. Legacy
      // rows whose totalSeats is null (rendered as "Uncapped" on
      // the Courses card) surface as `120` here — the schema's
      // documented default. The admin can edit it before saving,
      // and a fresh explicit value lands in the DB.
      totalSeats: course.totalSeats ?? 120,
      batchDays:
        course.batchDays && course.batchDays.length > 0
          ? course.batchDays.map((d) => ({
              // Carry the existing BatchDay id into the form so the
              // submission can round-trip it back to the backend.
              id: d.id,
              name: d.name || "",
              days: d.days,
              times: d.times,
              // Pre-fill the duration with the existing value
              // (or `60` for legacy rows whose `durationMinutes`
              // is null — those silently fell back to the 60-min
              // default on the kiosk. We surface that default
              // explicitly here so the required-field validation
              // on the form has a real value to bind to, and
              // the admin can tweak it before re-submitting.
              durationMinutes: d.durationMinutes ?? 60,
            }))
          : [{ name: "", days: [], times: [], durationMinutes: undefined }],
    });
    setOpen(true);
  };

  const handleDelete = async (course: TCourse) => {
    const ok = await confirmAction({
      title: "Delete this course?",
      description:
        "The course will be removed from the catalog. Existing enrollments are kept on student records but the course can no longer be reopened.",
      detail: course.name,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteCourse(course.id).unwrap();
      toast.success("Course deleted");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  const handleToggle = async (course: TCourse) => {
    try {
      const willActivate = !course.isActive;
      await toggleActive({ id: course.id, isActive: willActivate }).unwrap();
      toast.success(`Course ${willActivate ? "activated" : "deactivated"}`);
      // Switch to the tab the course now belongs to so the user sees the change.
      // setActiveTab(willActivate ? "active" : "inactive");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  const handleSetStatus = async (course: TCourse, status: TCourseStatus) => {
    const currentStatus = course.status ?? "ADMISSION";
    if (currentStatus === status) return;
    try {
      await setStatus({ id: course.id, status }).unwrap();
      toast.success(
        status === "COMPLETE"
          ? `Marked "${formatCourseLabel(course.name)}" as completed`
          : status === "ONGOING"
          ? `Course "${formatCourseLabel(course.name)}" set to ongoing`
          : `Course "${formatCourseLabel(course.name)}" back to admission`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  const handleToggleAdmitAnotherCourse = async (
    course: TCourse,
    next: boolean,
  ) => {
    const current = course.isAllowAdmitAnotherCourse ?? false;
    if (current === next) return;
    try {
      await toggleAdmit({
        id: course.id,
        isAllowAdmitAnotherCourse: next,
      }).unwrap();
      toast.success(
        next
          ? `Gate opened for "${formatCourseLabel(course.name)}"`
          : `Gate closed for "${formatCourseLabel(course.name)}"`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  /**
   * Per-slot "Take attendance" toggle. The endpoint auto-disables
   * every other slot in the same BatchDay (the "one at a time"
   * rule) so admins only ever have to flip one switch; the
   * `toggleSlot` mutation invalidates Course + Student caches so
   * the kiosk picks up the change on its next 60-second poll
   * (and the Courses page card re-renders immediately).
   */
  const handleToggleSlot = async (
    course: TCourse,
    batchDayId: string,
    slotIndex: number,
    enabled: boolean,
  ) => {
    try {
      await toggleSlot({
        id: course.id,
        batchDayId,
        slotIndex,
        enabled,
      }).unwrap();
      toast.success(
        enabled
          ? `Attendance enabled for ${formatCourseLabel(course.name)} · ${course.batchDays?.find((bd) => bd.id === batchDayId)?.times[slotIndex] ?? ''}`
          : `Attendance disabled for ${formatCourseLabel(course.name)} · ${course.batchDays?.find((bd) => bd.id === batchDayId)?.times[slotIndex] ?? ''}`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to toggle attendance");
    }
  };

  /**
   * Per-slot "check-in window override" handler. Lets the
   * admin open the kiosk window early (e.g. admit an early
   * arrival) or keep it open past the 5-min mark (e.g. the
   * class was delayed). Independent of the admit gate — a slot
   * can be admit-disabled (slotStates[i] === false) with the
   * override still on; the kiosk's check-in guard will
   * reject the scan regardless of the override state. The
   * override is per-slot and the default is off (default
   * 5-min window applies).
   */
  const handleToggleSlotWindow = async (
    course: TCourse,
    batchDayId: string,
    slotIndex: number,
    open: boolean,
  ) => {
    try {
      await setSlotWindow({
        id: course.id,
        batchDayId,
        slotIndex,
        open,
      }).unwrap();
      toast.success(
        open
          ? `Check-in window override OPEN for ${formatCourseLabel(course.name)} · ${course.batchDays?.find((bd) => bd.id === batchDayId)?.times[slotIndex] ?? ''} (scans accepted regardless of the wall clock)`
          : `Check-in window override CLOSED for ${formatCourseLabel(course.name)} · ${course.batchDays?.find((bd) => bd.id === batchDayId)?.times[slotIndex] ?? ''} (default 5-min window applies)`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to toggle window override");
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({
      name: "HSC_1ST_YEAR",
      fee: 0,
      description: "",
      hscBatch: "BATCH_27",
      // New courses default to uncapped in the form; submit-time
      // normalisation maps the empty string to `null`. Admins type
      // a number to set a cap explicitly.
      totalSeats: 120,
      batchDays: [{ name: "", days: [], times: [], durationMinutes: 60 }],
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Courses</h2>
          <p className="text-sm text-muted-foreground">
            {admissionCourses.length} admission · {ongoingCourses.length} ongoing · {completeCourses.length} completed
            {/* isActive is orthogonal to status — surface the pause
                count separately so a paused-but-Admission course shows
                up in the right tab with a small marker. */}
            {activeCount < allCourses.length
              ? ` · ${allCourses.length - activeCount} paused`
              : ""}
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Course" : "Create Course"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Course Name</Label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {courseNames.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Fee (৳)</Label>
                  <Input
                    id="fee"
                    type="number"
                    {...register("fee", { valueAsNumber: true })}
                  />
                  {errors.fee && (
                    <p className="text-sm text-destructive">
                      {errors.fee.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Per-slot seat cap. Required — every fresh course must
                  declare how many students each (batchDay,
                  batchTime) slot admits. A course with 2 batchDays
                  × 2 times[] = 4 slots × totalSeats = effectively
                  4×N seats across the course. The admit picker
                  shows per-slot counts via GET /course/:id/seats. */}
              <div className="space-y-2">
                <Label htmlFor="totalSeats">
                  Seats per slot <span className="text-destructive">*</span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Default 120. Min 1, max 10,000.
                  </span>
                </Label>
                <Input
                  id="totalSeats"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="e.g. 120"
                  {...register("totalSeats")}
                />
                {errors.totalSeats && (
                  <p className="text-sm text-destructive">
                    {(errors.totalSeats as { message?: string }).message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} />
              </div>

              <div className="space-y-2">
                <Label>HSC Batch *</Label>
                <Controller
                  control={control}
                  name="hscBatch"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hscBatches.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Batch Days *</Label>
                  <span className="text-xs text-muted-foreground">max 7</span>
                </div>
                {fields.map((field, index) => {
                  const day = watchedDays?.[index];
                  return (
                    <div
                      key={field.id}
                      className="rounded-md border p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Batch Day Name *</Label>
                          <Input
                            placeholder="e.g. Weekend batch"
                            {...register(`batchDays.${index}.name`)}
                          />
                          {errors.batchDays?.[index]?.name && (
                            <p className="text-sm text-destructive mt-1">
                              {
                                (errors.batchDays[index] as any).name
                                  ?.message as string
                              }
                            </p>
                          )}
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Days *</Label>
                        <MultiSelect
                          options={DAY_OPTIONS}
                          values={day?.days || []}
                          onChange={(next) =>
                            setValue(`batchDays.${index}.days`, next, {
                              shouldValidate: true,
                            })
                          }
                          placeholder="Select days..."
                          emptyMessage="No days available"
                        />
                        {errors.batchDays?.[index]?.days && (
                          <p className="text-sm text-destructive">
                            {
                              (errors.batchDays[index] as any).days
                                ?.message as string
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Times *</Label>
                        <ChipsEditor
                          values={day?.times || []}
                          onChange={(next) =>
                            setValue(`batchDays.${index}.times`, next, {
                              shouldValidate: true,
                            })
                          }
                          placeholder="e.g. 7:00 AM"
                          validate={(v) =>
                            timeRegex.test(v)
                              ? null
                              : 'Time must look like "7:00 AM"'
                          }
                          hint="Format: h:mm AM/PM (e.g. 7:00 AM, 4:30 PM)"
                        />
                        {errors.batchDays?.[index]?.times && (
                          <p className="text-sm text-destructive mt-1">
                            {
                              (errors.batchDays[index] as any).times
                                ?.message as string
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">
                          Class duration (hours : minutes)
                        </Label>
                        <DurationField
                          value={day?.durationMinutes ?? undefined}
                          onChange={(next) =>
                            setValue(
                              `batchDays.${index}.durationMinutes`,
                              next,
                              { shouldValidate: true },
                            )
                          }
                        />
                        {errors.batchDays?.[index]?.durationMinutes && (
                          <p className="text-sm text-destructive mt-1">
                            {
                              (errors.batchDays[index] as any).durationMinutes
                                ?.message as string
                            }
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          How long each class runs. Drives the
                          kiosk&apos;s live countdown / progress bar
                          AND feeds the schedule-conflict checker so
                          back-to-back classes can&apos;t silently
                          overlap. Required. Examples:&nbsp;
                          <span className="font-mono">1:00</span>,
                          {' '}<span className="font-mono">1:15</span>,
                          {' '}<span className="font-mono">1:30</span>,
                          {' '}<span className="font-mono">2:00</span>.
                        </p>
                      </div>
                    </div>
                  );
                })}
                {fields.length < 7 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ name: "", days: [], times: [], durationMinutes: 60 })
                    }
                  >
                    <Plus className="h-4 w-4" /> Add Batch Day
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">{editing ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TCourseStatus)}
      >
        <TabsList>
          {/*
            Three tabs, one per lifecycle stage. The active tab
            matches the stage color (blue/amber/emerald) so the
            status is unmistakable at a glance without opening any
            card. The count badge per tab gives a quick pipeline
            read — how many courses are admitting vs ongoing vs
            graduated.
          */}
          <TabsTrigger
            value="ADMISSION"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600"
          >
            Admission
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
              {admissionCourses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="ONGOING"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-600"
          >
            Ongoing
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
              {ongoingCourses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="COMPLETE"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:border-emerald-600"
          >
            Completed
            <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800">
              {completeCourses.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : displayedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">
                {activeTab === "ADMISSION"
                  ? "No courses in admission. Click New Course to add one, or move an existing course here from its current status tab."
                  : activeTab === "ONGOING"
                  ? "No ongoing courses. Move a course to ONGOING from its current stage to see it here."
                  : "No completed courses yet. Mark a course COMPLETE from its status control to graduate a batch."}
              </p>
            ) : (
              displayedCourses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{formatCourseLabel(course.name)}</span>
                      <div className="flex items-center gap-1.5">
                        {/* Course lifecycle badge — Admission is the
                            default (new courses), Ongoing signals the
                            batch is in flight, Complete means the batch
                            has graduated and its students can move to a
                            new course. Color-coded so the active tab +
                            the lifecycle stage are both readable at a
                            glance without opening the edit modal. */}
                        <StatusBadge status={course.status ?? "ADMISSION"} />
                        <Badge
                          variant={course.isActive ? "success" : "secondary"}
                        >
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-2xl font-bold">
                      ৳{Number(course.fee).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      HSC Batch:{" "}
                      <span className="font-medium">
                        {formatBatchLabel(course.hscBatch)}
                      </span>
                    </p>
                    {/* Per-slot seat-cap read-out. Course.totalSeats
                        applies to each (batchDay, batchTime) slot
                        independently — the picker shows per-slot
                        fullness, so this card only needs to surface
                        the cap. There is no "course is full" state
                        anymore; that's a per-slot concern. */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Per slot:</span>
                      {course.totalSeats == null ? (
                        <Badge variant="outline" className="text-xs">
                          Uncapped
                        </Badge>
                      ) : (
                        <span className="font-medium">{course.totalSeats}</span>
                      )}
                    </div>
                    {course.batchDays && course.batchDays.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Batch Days ({course.batchDays.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {course.batchDays.map((d) => (
                            <div
                              key={d.id}
                              className="rounded-md bg-muted/40 px-2 py-1"
                            >
                              <div className="text-xs font-medium">
                                {d.name}
                                {d.durationMinutes ? (
                                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                    ({minutesToHm(d.durationMinutes)} per class)
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {d.days.map((day) => (
                                  <Badge
                                    key={day}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {day}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {d.times.map((t, slotIdx) => {
                                  // Legacy rows / unset values default
                                  // to "all ON" so existing data
                                  // continues to admit scans.
                                  const slotEnabled =
                                    d.slotStates?.[slotIdx] ?? true;
                                  // Slot toggling is only allowed on
                                  // ONGOING courses — see the backend
                                  // toggleBatchSlotToDB gate. For
                                  // ADMISSION / COMPLETE we still
                                  // render the chip so the admin can
                                  // see the current admit-state
                                  // snapshot, but the Switch is
                                  // hidden (and a small badge replaces
                                  // it) so they don't try to flip a
                                  // non-togglable state.
                                  const canToggle =
                                    (course.status ?? 'ADMISSION') ===
                                    'ONGOING';
                                  return (
                                    <div
                                      key={t}
                                      className={`flex items-center gap-1.5 rounded-md pl-2 pr-1 py-0.5 text-xs ${
                                        slotEnabled
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                          : "bg-slate-100 text-slate-500 border border-slate-200"
                                      }`}
                                      title={
                                        canToggle
                                          ? slotEnabled
                                            ? "Attendance is ON for this slot. Click the switch to disable it. (Only one slot can be ON at a time across the entire course — toggling this OFF will let you pick another slot.)"
                                            : "Attendance is OFF for this slot. Click the switch to enable it. (Turning this ON will auto-disable any other ON slot across the course.)"
                                          : "Slot toggling is disabled for this course's current stage. Move the course to ONGOING first via the status segmented control."
                                      }
                                    >
                                      <span className="font-mono font-semibold">
                                        {t}
                                      </span>
                                      <span className="text-[10px] uppercase tracking-wider">
                                        {slotEnabled ? "ON" : "OFF"}
                                      </span>
                                      {canToggle ? (
                                        <Switch
                                          checked={slotEnabled}
                                          disabled={togglingSlot}
                                          onCheckedChange={(next) =>
                                            handleToggleSlot(
                                              course,
                                              d.id,
                                              slotIdx,
                                              next,
                                            )
                                          }
                                          className="scale-75 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-300"
                                          aria-label={`Toggle attendance for ${t}`}
                                        />
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground italic">
                                          (locked)
                                        </span>
                                      )}
                                      {/* Check-in window override switch.
                                          Lets the admin open the kiosk
                                          window early (e.g. admit an
                                          early arrival) or keep it open
                                          past the 5-min mark (e.g. the
                                          class was delayed). Independent
                                          of the admit gate — a slot can
                                          be admit-disabled with the
                                          override still on, but the
                                          kiosk's check-in guard rejects
                                          scans for disabled slots
                                          regardless of the override
                                          state. */}
                                      <WindowOverrideSwitch
                                        value={
                                          d.manualWindowOverride?.[
                                            slotIdx
                                          ] === true
                                        }
                                        disabled={
                                          !canToggle ||
                                          settingSlotWindow
                                        }
                                        onChange={(next) =>
                                          handleToggleSlotWindow(
                                            course,
                                            d.id,
                                            slotIdx,
                                            next,
                                          )
                                        }
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {course.description && (
                      <p className="text-sm text-muted-foreground">
                        {course.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(course)}
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      {/* Single-click status segmented control. Replaces
                          the old "Mark Complete / Re-open" button — the
                          admin just taps the target stage and the server
                          moves the course there (and keeps
                          `isAllowAdmitAnotherCourse` consistent). The
                          current stage button is also disabled so the
                          admin gets immediate visual feedback about the
                          present state. */}
                      <StatusSegmentedControl
                        value={course.status ?? "ADMISSION"}
                        disabled={settingStatus}
                        onChange={(s) => handleSetStatus(course, s)}
                      />
                      {/* Independent manual override for the enrollment
                          gate. Decouples from the status enum above —
                          see service comment for the override-vs-status
                          interaction rules. */}
                      <AdmitAnotherCourseToggle
                        value={course.isAllowAdmitAnotherCourse ?? false}
                        disabled={togglingAdmit}
                        onToggle={(next) =>
                          handleToggleAdmitAnotherCourse(course, next)
                        }
                      />
                      <Button
                        variant={course.isActive ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleToggle(course)}
                        disabled={toggling}
                      >
                        <Power className="h-4 w-4" />{" "}
                        {course.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(course)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      {confirmDialog}
    </div>
  );
};

// ─── Course-status helpers ────────────────────────────────────────────────
// Small presentational helpers used by the Courses page. Defined inline
// (not in /ui) because they're tightly coupled to the TCourseStatus type
// and have no other consumers today.

/**
 * Status badge rendered in the course card header. Mirrors the colour
 * scheme used by other admission-stage badges (PAID green, etc.) so the
 * visual grammar carries over: blue = ongoing, gray = admission,
 * green = complete.
 */
const StatusBadge = ({ status }: { status: TCourseStatus }) => {
  // Solid-fill badges with high-contrast foreground text so the
  // lifecycle stage is unmistakable from across the table. We keep
  // the icons consistent with the segmented control (in the card
  // footer) so the visual language ties the two controls together:
  //   ADMISSION  → blue + Plus     (open for new admits)
  //   ONGOING    → amber + Sparkles (batch in flight)
  //   COMPLETE   → emerald + CheckCircle2 (graduated)
  const styles: Record<TCourseStatus, string> = {
    ADMISSION:
      "bg-blue-500 text-white border-blue-600 shadow-sm shadow-blue-500/30",
    ONGOING:
      "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30",
    COMPLETE:
      "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/30",
  };
  const labels: Record<TCourseStatus, string> = {
    ADMISSION: "Admission",
    ONGOING: "Ongoing",
    COMPLETE: "Complete",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded ${styles[status]}`}
    >
      {status === "ADMISSION" && <Plus className="h-3 w-3" />}
      {status === "ONGOING" && <Sparkles className="h-3 w-3" />}
      {status === "COMPLETE" && <CheckCircle2 className="h-3 w-3" />}
      {labels[status]}
    </span>
  );
};

/**
 * Three-stage segmented control for the course lifecycle. The current
 * stage button is highlighted (filled) and disabled, the other two are
 * outlined — tapping an outlined stage fires `onChange(stage)` which
 * the parent dispatches to the server. `disabled` freezes the control
 * during the in-flight mutation so admins don't double-tap.
 */
const StatusSegmentedControl = ({
  value,
  onChange,
  disabled,
}: {
  value: TCourseStatus;
  onChange: (next: TCourseStatus) => void;
  disabled?: boolean;
}) => {
  const stages: TCourseStatus[] = ["ADMISSION", "ONGOING", "COMPLETE"];
  // Color matching the badge above so the two controls feel like one
  // visual unit: the active stage is filled with its stage color,
  // inactive stages stay outlined and dim. Hover deepens the fill so
  // admins can see at a glance which stage they'd move to.
  const activeStyles: Record<TCourseStatus, string> = {
    ADMISSION: "bg-blue-500 text-white border-blue-600",
    ONGOING: "bg-amber-500 text-white border-amber-600",
    COMPLETE: "bg-emerald-500 text-white border-emerald-600",
  };
  const hoverStyles: Record<TCourseStatus, string> = {
    ADMISSION: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
    ONGOING: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300",
    COMPLETE: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300",
  };
  return (
    <div
      role="radiogroup"
      aria-label="Course status"
      className="inline-flex rounded-md border bg-muted/40 p-0.5 gap-0.5"
    >
      {stages.map((s) => {
        const isActive = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled || isActive}
            onClick={() => onChange(s)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
              isActive
                ? `${activeStyles[s]} shadow-sm`
                : `text-muted-foreground border-transparent ${hoverStyles[s]} disabled:opacity-50`
            }`}
          >
            {s === "ADMISSION" ? "Admission" : s === "ONGOING" ? "Ongoing" : "Complete"}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Single-click toggle for the `isAllowAdmitAnotherCourse` gate.
 * Decoupled from the status segmented control above — see the
 * service comment for the override-vs-status interaction rules.
 *
 * Visual: when the gate is open the pill is filled emerald with an
 * Unlock icon (admit unlocked); when closed it's outlined gray with a
 * Lock icon (default gate). The pill's tooltip explains what it does
 * so admins don't have to read source to figure out the relationship
 * with the status enum above.
 */
const AdmitAnotherCourseToggle = ({
  value,
  disabled,
  onToggle,
}: {
  value: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onToggle(!value)}
      title={
        value
          ? "Gate is OPEN: students with an active enrollment here can admit into another course. Click to close."
          : "Gate is CLOSED: students with an active enrollment here cannot admit into another course. Click to open."
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
        value
          ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 shadow-sm shadow-emerald-500/30"
          : "bg-background text-muted-foreground border-dashed border-muted-foreground/40 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {value ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {value ? "Admit: Open" : "Admit: Closed"}
    </button>
  );
};

/**
 * Per-slot "check-in window override" switch. The default
 * 5-min check-in window opens at class start and closes 5
 * min after. The admin can flip this switch to open the
 * window early (e.g. admit a parent who's early) or keep
 * it open past the 5-min mark (e.g. when the class was
 * delayed). The switch is independent of the admit gate
 * (slotStates[i]) — flipping the override on while the slot
 * is admit-disabled does nothing for scans, since the kiosk
 * still rejects them.
 */
const WindowOverrideSwitch = ({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      title={
        value
          ? "Window override is OPEN: kiosk accepts scans regardless of the wall clock. Click to close (default 5-min window applies)."
          : "Window override is CLOSED: kiosk uses the default 5-min window. Click to open the window early or keep it open past 5 min."
      }
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
        value
          ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm shadow-amber-500/30"
          : "bg-background text-muted-foreground border-dashed border-muted-foreground/40 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50"
      }`}
    >
      <Unlock className="h-3 w-3" />
      {value ? "Window: Open" : "Window: Auto"}
    </button>
  );
};

export default CoursesPage;
