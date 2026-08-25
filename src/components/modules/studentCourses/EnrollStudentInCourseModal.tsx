"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEnrollStudentMutation } from "@/redux/features/studentCourse/studentCourse";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import { TStudent } from "@/types/student";
import { formatCourseLabel } from "@/constants/labels";

const schema = z.object({
  courseId: z.string().min(1, "Select a course"),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  student: TStudent;
  onSuccess?: () => void;
};

const EnrollStudentInCourseModal = ({ open, onClose, student, onSuccess }: Props) => {
  const [enroll, { isLoading }] = useEnrollStudentMutation();
  const { data: coursesData } = useGetAllCoursesQuery({ isActive: true, limit: 100 });
  const [submitting, setSubmitting] = useState(false);
  const courses = coursesData?.data || [];
  const enrolledIds = new Set(student.studentCourses?.map((sc) => sc.courseId) || []);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { courseId: "" },
  });

  const availableCourses = courses.filter((c) => !enrolledIds.has(c.id));

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await enroll({ studentId: student.id, courseId: data.courseId }).unwrap();
      toast.success("Enrolled in course");
      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll {student.user.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Course *</Label>
            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.length === 0 && (
                      <SelectItem value="none" disabled>
                        No courses available
                      </SelectItem>
                    )}
                    {availableCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {formatCourseLabel(c.name)} — ৳{Number(c.fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.courseId && (
              <p className="text-sm text-destructive">{errors.courseId.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || isLoading}>
              Enroll
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollStudentInCourseModal;