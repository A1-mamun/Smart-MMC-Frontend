"use client";
import { useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateExamMutation,
  useUpdateExamMutation,
} from "@/redux/features/exam/exam";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import type { TExam } from "@/types/exam";

const sectionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["MCQ", "WRITTEN"]),
  name: z.string().min(1, "Name required").max(80),
  totalQuestions: z.number({ error: "Required" }).int().min(1, "Min 1").max(500),
  marksPerQuestion: z.number({ error: "Required" }).min(0, "Min 0").max(1000),
});

/**
 * Per-exam weekly schedule slot. Mirrors the backend
 * `ExamSchedule` shape so the kiosk can render the same
 * day/time grid it uses for the course schedule. All fields
 * are required when a row is added; rows can be removed
 * freely.
 */
const scheduleSlotSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().max(50).optional().or(z.literal("")),
  days: z.array(z.string().min(1)).min(1, "Pick at least one day"),
  times: z
    .array(
      z
        .string()
        .trim()
        .regex(
          /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
          'Time must be "h:mm AM/PM" (e.g. 7:00 AM)',
        ),
    )
    .min(1, "Add at least one time"),
  durationMinutes: z
    .number({ error: "Required" })
    .int("Whole minutes only")
    .min(1, "Min 1 min")
    .max(600, "Max 600 min"),
});

const formSchema = z
  .object({
    title: z.string().trim().min(2, "Min 2 chars").max(200),
    syllabus: z.string().min(1, "Syllabus required").max(10_000),
    examDate: z.string().min(1, "Date required"),
    // Wall-clock window. Both fields are optional on the
    // form — empty strings mean "not set" (sent as `null`
    // on submit). The endTime > startTime cross-field check
    // is applied via the same `.superRefine` the backend
    // uses, so the user gets the same error message before
    // the round-trip.
    startTime: z.string().optional().or(z.literal("")),
    endTime: z.string().optional().or(z.literal("")),
    courseId: z.string().uuid("Select a course"),
    sections: z.array(sectionSchema).min(1, "At least 1 section"),
    // Optional weekly schedule rows. Max 7 to match the
    // backend cap. The submit handler converts an empty
    // list to `[]` (which the backend treats as "no
    // schedule" / "clear the existing list" on update).
    weeklySchedules: z.array(scheduleSlotSchema).max(7).optional(),
  })
  .superRefine((b, ctx) => {
    // Only enforce ordering when BOTH times are filled.
    // Partial input is fine ("I know when it starts, not
    // when it ends").
    if (b.startTime && b.endTime && b.endTime <= b.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type Props = {
  open: boolean;
  exam: TExam | null;
  onClose: () => void;
  onSaved: () => void;
};

const formatCourseName = (name?: string) => {
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "HSC Final Preparation",
    ADVANCED_ADMISSION: "Advanced Admission",
    ENGINEERING_AND_VARSITY_ADMISSION: "Engineering & Varsity Admission",
  };
  return (name && map[name]) || name || "—";
};

const ExamFormModal = ({ open, exam, onClose, onSaved }: Props) => {
  const isEdit = !!exam;
  const { data: coursesData } = useGetAllCoursesQuery(
    { limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      syllabus: "",
      examDate: "",
      startTime: "",
      endTime: "",
      courseId: "",
      sections: [{ type: "MCQ", name: "MCQ", totalQuestions: 30, marksPerQuestion: 1 }],
      weeklySchedules: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  const {
    fields: scheduleFields,
    append: appendSchedule,
    remove: removeSchedule,
  } = useFieldArray({
    control: form.control,
    name: "weeklySchedules",
  });

  useEffect(() => {
    if (exam) {
      form.reset({
        title: exam.title,
        syllabus: exam.syllabus,
        examDate: exam.examDate.slice(0, 10),
        // The backend stores `startTime` / `endTime` as full
        // ISO timestamps (or null). The form only cares
        // about the time-of-day portion (HH:MM), so slice
        // the ISO string down to the wall-clock segment of
        // the exam's date. Falls back to empty string when
        // the exam has no time set.
        startTime: exam.startTime
          ? dayjs(exam.startTime).format("HH:mm")
          : "",
        endTime: exam.endTime ? dayjs(exam.endTime).format("HH:mm") : "",
        courseId: exam.courseId,
        sections: exam.sections.map((s) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          totalQuestions: s.totalQuestions,
          marksPerQuestion: s.marksPerQuestion,
        })),
        // Pre-fill weekly schedules from the exam's stored
        // rows (if any). The backend returns `schedules`
        // as `TExamSchedule[]`; map to the form shape
        // (empty-string `name` so the optional field is
        // defined in the form state).
        weeklySchedules: (exam.schedules ?? []).map((s) => ({
          id: s.id,
          name: s.name ?? "",
          days: s.days,
          times: s.times,
          durationMinutes: s.durationMinutes,
        })),
      });
    } else if (open) {
      form.reset({
        title: "",
        syllabus: "",
        examDate: "",
        startTime: "",
        endTime: "",
        courseId: "",
        sections: [
          { type: "MCQ", name: "MCQ", totalQuestions: 30, marksPerQuestion: 1 },
        ],
        weeklySchedules: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, open]);

  const [createExam, { isLoading: creating }] = useCreateExamMutation();
  const [updateExam, { isLoading: updating }] = useUpdateExamMutation();

  const onSubmit = async (values: FormValues) => {
    try {
      // Combine the date + time-of-day inputs into a full
      // ISO timestamp the backend can store. An empty
      // time-of-day becomes `null` (date-only exam).
      // dayjs is local-timezone aware so the resulting
      // timestamp reflects the admin's wall clock.
      const startTime = values.startTime
        ? dayjs(`${values.examDate}T${values.startTime}`).toISOString()
        : null;
      const endTime = values.endTime
        ? dayjs(`${values.examDate}T${values.endTime}`).toISOString()
        : null;

      // Strip empty weekly-schedule rows (a row the user
      // added but didn't fill in). Each retained row is
      // forwarded verbatim — the backend Zod schema will
      // reject truly empty rows but the form-level
      // "min(1) days / min(1) times" rules already block
      // those.
      const cleanedSchedules = (values.weeklySchedules ?? [])
        .map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          ...(s.name ? { name: s.name } : {}),
          days: s.days,
          times: s.times,
          durationMinutes: s.durationMinutes,
        }))
        .filter((s) => s.days.length > 0 && s.times.length > 0);

      const payload = {
        ...values,
        startTime,
        endTime,
        weeklySchedules:
          cleanedSchedules.length > 0 ? cleanedSchedules : undefined,
      };

      if (isEdit && exam) {
        await updateExam({ id: exam.id, data: payload }).unwrap();
        toast.success("Exam updated");
      } else {
        await createExam(payload).unwrap();
        toast.success("Exam created — examinees added");
      }
      onSaved();
    } catch (e) {
      const msg =
        (e as { data?: { message?: string } })?.data?.message ??
        (e as { message?: string })?.message ??
        "Failed to save";
      toast.error(msg);
    }
  };

  // Watch sections for total computation.
  const watchedSections = form.watch("sections");
  const totalMarks = (watchedSections || []).reduce(
    (acc, s) => acc + Math.round((s.totalQuestions || 0) * (s.marksPerQuestion || 0)),
    0,
  );

  // Today's date in `YYYY-MM-DD` for the date-input's `min` attribute. The
  // browser blocks past dates natively; the backend enforces the same rule
  // for API-direct callers (defence in depth). We memoise so we don't
  // recompute every render and so a stale value doesn't lock the field.
  //
  // On edit, if the existing exam date is already in the past (legitimate
  // — e.g. created yesterday for today, or the admin is just touching other
  // fields) we let that value stay. The minimum then becomes the smaller of
  // (today, existing date) so the input never forces a date change.
  const todayIso = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const minDate = useMemo(() => {
    if (!exam) return todayIso;
    const existing = exam.examDate.slice(0, 10);
    return existing < todayIso ? existing : todayIso;
  }, [exam, todayIso]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit exam" : "Create exam"}</DialogTitle>
          <DialogDescription>
            At least one section is required. Total marks are computed
            automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. HSC 1st Year Mid-term"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="examDate">Exam date</Label>
              <Input
                id="examDate"
                type="date"
                min={minDate}
                {...form.register("examDate")}
              />
              {form.formState.errors.examDate && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.examDate.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="startTime">Start time (optional)</Label>
              <Input
                id="startTime"
                type="time"
                {...form.register("startTime")}
              />
              {form.formState.errors.startTime && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startTime.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="endTime">End time (optional)</Label>
              <Input
                id="endTime"
                type="time"
                {...form.register("endTime")}
              />
              {form.formState.errors.endTime && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.endTime.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="courseId">Course</Label>
              <Controller
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {formatCourseName(c.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.courseId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.courseId.message}
                </p>
              )}
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="syllabus">Syllabus</Label>
              <Textarea
                id="syllabus"
                placeholder="Topics covered..."
                rows={3}
                {...form.register("syllabus")}
              />
              {form.formState.errors.syllabus && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.syllabus.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Sections</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    type: "WRITTEN",
                    name: `Section ${fields.length + 1}`,
                    totalQuestions: 1,
                    marksPerQuestion: 1,
                  })
                }
              >
                <Plus className="h-4 w-4" /> Add section
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => {
                const w = watchedSections?.[idx];
                // Guard against NaN: react-hook-form with `valueAsNumber:
                // true` reports `NaN` for an empty input, and `NaN * 0`
                // is `NaN`, which then trips React's "Received NaN for the
                // `value` attribute" warning on the read-only total.
                // Treat any non-finite operand as 0.
                const tq = Number.isFinite(w?.totalQuestions)
                  ? (w?.totalQuestions ?? 0)
                  : 0;
                const mpq = Number.isFinite(w?.marksPerQuestion)
                  ? (w?.marksPerQuestion ?? 0)
                  : 0;
                const tm = Math.round(tq * mpq);
                return (
                  <div
                    key={field.id}
                    className="grid gap-2 md:grid-cols-12 items-end rounded-md border bg-muted/30 p-3"
                  >
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Controller
                        control={form.control}
                        name={`sections.${idx}.type`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">MCQ</SelectItem>
                              <SelectItem value="WRITTEN">Written</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        {...form.register(`sections.${idx}.name`)}
                        placeholder="MCQ / Srijonsil / BUET"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Questions</Label>
                      <Input
                        type="number"
                        min={1}
                        {...form.register(`sections.${idx}.totalQuestions`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Marks/Q</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        {...form.register(`sections.${idx}.marksPerQuestion`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Total</Label>
                      <Input type="number" value={tm} readOnly className="bg-muted" />
                    </div>
                    <div className="md:col-span-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(idx)}
                          aria-label="Remove section"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Exam total: <span className="font-semibold">{totalMarks}</span> marks
            </p>
          </div>

          {/*
           * Optional weekly schedule — mirrors the course
           * `BatchDay` rows. Most exams are one-shot
           * (startTime/endTime alone is enough); the
           * weekly grid is for the rare exam that's held
           * on the same day(s) every week across multiple
           * weeks (e.g. a 3-week pre-test cycle). The
           * kiosk uses the same UI primitives to render
           * these slots as it does for the course schedule.
           */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Weekly schedule (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Recurring slots for multi-week exams. Leave empty for
                  one-shot exams — start/end time is enough.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={scheduleFields.length >= 7}
                onClick={() =>
                  appendSchedule({
                    name: "",
                    days: [],
                    times: [],
                    durationMinutes: 60,
                  })
                }
              >
                <Plus className="h-4 w-4" /> Add slot
              </Button>
            </div>
            {scheduleFields.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                No weekly slots. The kiosk will show this exam on its
                <code className="mx-1 rounded bg-muted px-1">examDate</code>
                only.
              </p>
            ) : (
              <div className="space-y-2">
                {scheduleFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="rounded-md border bg-muted/20 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Input
                        placeholder="Slot name (optional)"
                        {...form.register(`weeklySchedules.${idx}.name`)}
                        className="max-w-[260px]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSchedule(idx)}
                        aria-label={`Remove slot ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-12 items-end">
                      <div className="md:col-span-5 space-y-1">
                        <Label className="text-xs">Days</Label>
                        <Controller
                          control={form.control}
                          name={`weeklySchedules.${idx}.days`}
                          defaultValue={[] as string[]}
                          render={({ field: f }) => {
                            const days: string[] = f.value ?? [];
                            return (
                              <div className="flex flex-wrap gap-1">
                                {WEEKDAYS.map((d) => {
                                  const active = days.includes(d);
                                  return (
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={() =>
                                        f.onChange(
                                          active
                                            ? days.filter((v) => v !== d)
                                            : [...days, d],
                                        )
                                      }
                                      className={
                                        "rounded-md border px-2 py-1 text-[10px] font-medium " +
                                        (active
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-input bg-background text-muted-foreground")
                                      }
                                    >
                                      {d.slice(0, 3)}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          }}
                        />
                        {form.formState.errors.weeklySchedules?.[idx]?.days
                          ?.message ? (
                          <p className="text-xs text-destructive">
                            {
                              form.formState.errors.weeklySchedules[idx].days
                                .message
                            }
                          </p>
                        ) : null}
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-xs">Times (comma separated)</Label>
                        <Controller
                          control={form.control}
                          name={`weeklySchedules.${idx}.times`}
                          defaultValue={[]}
                          render={({ field: f }) => (
                            <Input
                              placeholder="7:00 AM, 4:00 PM"
                              value={(f.value ?? []).join(", ")}
                              onChange={(e) => {
                                const parts = e.target.value
                                  .split(",")
                                  .map((p) => p.trim())
                                  .filter(Boolean);
                                f.onChange(parts);
                              }}
                            />
                          )}
                        />
                        {form.formState.errors.weeklySchedules?.[idx]?.times
                          ?.message ? (
                          <p className="text-xs text-destructive">
                            {
                              form.formState.errors.weeklySchedules[idx].times
                                .message
                            }
                          </p>
                        ) : null}
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={600}
                          {...form.register(
                            `weeklySchedules.${idx}.durationMinutes`,
                            { valueAsNumber: true },
                          )}
                        />
                        {form.formState.errors.weeklySchedules?.[idx]
                          ?.durationMinutes?.message ? (
                          <p className="text-xs text-destructive">
                            {
                              form.formState.errors.weeklySchedules[idx]
                                .durationMinutes.message
                            }
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || updating}>
              {(creating || updating) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Save changes" : "Create exam"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExamFormModal;