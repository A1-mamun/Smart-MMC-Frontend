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

const formSchema = z.object({
  title: z.string().trim().min(2, "Min 2 chars").max(200),
  syllabus: z.string().min(1, "Syllabus required").max(10_000),
  examDate: z.string().min(1, "Date required"),
  courseId: z.string().uuid("Select a course"),
  sections: z.array(sectionSchema).min(1, "At least 1 section"),
});

type FormValues = z.infer<typeof formSchema>;

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
    ADMISSION: "Admission",
  };
  return (name && map[name]) || name || "—";
};

const ExamFormModal = ({ open, exam, onClose, onSaved }: Props) => {
  const isEdit = !!exam;
  const { data: coursesData } = useGetAllCoursesQuery(
    { isActive: true, limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      syllabus: "",
      examDate: "",
      courseId: "",
      sections: [{ type: "MCQ", name: "MCQ", totalQuestions: 30, marksPerQuestion: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  useEffect(() => {
    if (exam) {
      form.reset({
        title: exam.title,
        syllabus: exam.syllabus,
        examDate: exam.examDate.slice(0, 10),
        courseId: exam.courseId,
        sections: exam.sections.map((s) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          totalQuestions: s.totalQuestions,
          marksPerQuestion: s.marksPerQuestion,
        })),
      });
    } else if (open) {
      form.reset({
        title: "",
        syllabus: "",
        examDate: "",
        courseId: "",
        sections: [
          { type: "MCQ", name: "MCQ", totalQuestions: 30, marksPerQuestion: 1 },
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, open]);

  const [createExam, { isLoading: creating }] = useCreateExamMutation();
  const [updateExam, { isLoading: updating }] = useUpdateExamMutation();

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && exam) {
        await updateExam({ id: exam.id, data: values }).unwrap();
        toast.success("Exam updated");
      } else {
        await createExam(values).unwrap();
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
                const tm = Math.round(
                  (w?.totalQuestions ?? 0) * (w?.marksPerQuestion ?? 0),
                );
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