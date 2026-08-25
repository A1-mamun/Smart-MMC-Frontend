"use client";
import { useState } from "react";
import { Plus, Edit, Trash2, Power, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCourseMutation,
  useDeleteCourseMutation,
  useGetAllCoursesQuery,
  useToggleCourseActiveMutation,
  useUpdateCourseMutation,
} from "@/redux/features/course/course";
import { TCourse } from "@/types/student";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { courseNames } from "@/constants/courseNames";
import { hscBatches } from "@/constants/batches";
import { formatBatchLabel, formatCourseLabel } from "@/constants/labels";

const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

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

const CoursesPage = () => {
  const { data, isLoading, refetch } = useGetAllCoursesQuery({ limit: 100 });
  const [createCourse] = useCreateCourseMutation();
  const [updateCourse] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [toggleActive, { isLoading: toggling }] =
    useToggleCourseActiveMutation();
  const [editing, setEditing] = useState<TCourse | null>(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

  const allCourses = data?.data || [];
  const activeCourses = allCourses.filter((c) => c.isActive);
  const inactiveCourses = allCourses.filter((c) => !c.isActive);
  const displayedCourses =
    activeTab === "active" ? activeCourses : inactiveCourses;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "HSC_1ST_YEAR",
      fee: 0,
      description: "",
      hscBatch: "BATCH_27",
      batchDays: [{ name: "", days: [], times: [] }],
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
        batchDays: formData.batchDays.map((d) => ({
          name: d.name.trim(),
          days: d.days,
          times: d.times,
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
      batchDays:
        course.batchDays && course.batchDays.length > 0
          ? course.batchDays.map((d) => ({
              name: d.name || "",
              days: d.days,
              times: d.times,
            }))
          : [{ name: "", days: [], times: [] }],
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    try {
      await deleteCourse(id).unwrap();
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

  const openCreate = () => {
    setEditing(null);
    reset({
      name: "HSC_1ST_YEAR",
      fee: 0,
      description: "",
      hscBatch: "BATCH_27",
      batchDays: [{ name: "", days: [], times: [] }],
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Courses</h2>
          <p className="text-sm text-muted-foreground">
            {activeCourses.length} active · {inactiveCourses.length} inactive
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
                    </div>
                  );
                })}
                {fields.length < 7 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", days: [], times: [] })}
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
        onValueChange={(v) => setActiveTab(v as "active" | "inactive")}
      >
        <TabsList>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-2">
              {activeCourses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive
            <Badge variant="secondary" className="ml-2">
              {inactiveCourses.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : displayedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">
                {activeTab === "active"
                  ? "No active courses. Click New Course to add one."
                  : "No inactive courses."}
              </p>
            ) : (
              displayedCourses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{formatCourseLabel(course.name)}</span>
                      <Badge
                        variant={course.isActive ? "success" : "secondary"}
                      >
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
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
                              <div className="flex flex-wrap gap-1 mt-1">
                                {d.times.map((t) => (
                                  <Badge
                                    key={t}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {t}
                                  </Badge>
                                ))}
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
                        onClick={() => handleDelete(course.id)}
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
    </div>
  );
};

export default CoursesPage;
