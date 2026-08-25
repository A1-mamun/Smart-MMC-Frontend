"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Copy } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import { useAdmitStudentMutation } from "@/redux/features/student/student";
import { educationBoards } from "@/constants/boards";
import { bloodGroups } from "@/constants/bloodGroups";
import { formatCourseLabel } from "@/constants/labels";
import { TStudentCredentials } from "@/types/student";

const phoneRegex = /^01[3-9]\d{8}$/;

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  nickname: z.string().optional(),
  college: z.string().optional(),
  mobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  bloodGroup: z.enum([
    "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
    "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE",
  ]),
  fatherName: z.string().min(2, "Father name is required"),
  fatherOccupation: z.string().min(2, "Required"),
  fatherMobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  motherName: z.string().min(2, "Mother name is required"),
  motherOccupation: z.string().min(2, "Required"),
  motherMobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  addressVillage: z.string().min(1, "Required"),
  addressPostOffice: z.string().min(1, "Required"),
  addressUpozila: z.string().min(1, "Required"),
  addressDistrict: z.string().min(1, "Required"),
  sscInstitute: z.string().min(1, "Required"),
  sscBoard: z.enum([
    "DHAKA", "CHITTAGONG", "RAJSHAHI", "COMILLA", "SYLHET",
    "BARISAL", "JESSORE", "MYMENSINGH", "MADRASAH", "TECHNICAL",
  ]),
  sscPassingYear: z.number().min(2010).max(new Date().getFullYear()),
  sscGpa: z.number().min(0).max(5),
  courseId: z.string().uuid("Select a course"),
  batchDayId: z.string().uuid("Select a batch day"),
  batchTime: z
    .string()
    .trim()
    .regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, 'Time must look like "7:00 AM"'),
});

type FormData = z.infer<typeof schema>;

const AdmitStudentForm = () => {
  const router = useRouter();
  const [admitStudent, { isLoading }] = useAdmitStudentMutation();
  const { data: coursesData } = useGetAllCoursesQuery({ isActive: true, limit: 100 });
  const courses = useMemo(() => coursesData?.data || [], [coursesData]);
  const [credentials, setCredentials] = useState<TStudentCredentials | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      nickname: "",
      college: "",
      mobile: "",
      fatherName: "",
      fatherOccupation: "",
      fatherMobile: "",
      motherName: "",
      motherOccupation: "",
      motherMobile: "",
      addressVillage: "",
      addressPostOffice: "",
      addressUpozila: "",
      addressDistrict: "",
      sscInstitute: "",
      sscPassingYear: new Date().getFullYear() - 1,
      sscGpa: 4.0,
      courseId: "",
      batchDayId: "",
      batchTime: "4:00 PM",
    },
  });

  const selectedCourseId = watch("courseId");
  const selectedBatchDayId = watch("batchDayId");
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );
  const selectedBatchDay = useMemo(
    () => selectedCourse?.batchDays?.find((d) => d.id === selectedBatchDayId) || null,
    [selectedCourse, selectedBatchDayId],
  );

  const handleCourseChange = (value: string) => {
    setValue("courseId", value, { shouldValidate: true });
    const course = courses.find((c) => c.id === value);
    if (course && course.batchDays && course.batchDays.length > 0) {
      const firstDay = course.batchDays[0];
      setValue("batchDayId", firstDay.id, { shouldValidate: true });
      setValue("batchTime", firstDay.times[0]);
    } else {
      setValue("batchDayId", "");
    }
  };

  const handleBatchDayChange = (dayId: string) => {
    setValue("batchDayId", dayId, { shouldValidate: true });
    const day = selectedCourse?.batchDays?.find((d) => d.id === dayId);
    if (day) {
      setValue("batchTime", day.times[0]);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        nickname: data.nickname,
        college: data.college,
        mobile: data.mobile,
        bloodGroup: data.bloodGroup,
        fatherName: data.fatherName,
        fatherOccupation: data.fatherOccupation,
        fatherMobile: data.fatherMobile,
        motherName: data.motherName,
        motherOccupation: data.motherOccupation,
        motherMobile: data.motherMobile,
        addressVillage: data.addressVillage,
        addressPostOffice: data.addressPostOffice,
        addressUpozila: data.addressUpozila,
        addressDistrict: data.addressDistrict,
        sscInstitute: data.sscInstitute,
        sscBoard: data.sscBoard,
        sscPassingYear: data.sscPassingYear,
        sscGpa: data.sscGpa,
        courseId: data.courseId,
        batchDayId: data.batchDayId,
        batchTime: data.batchTime,
      };
      const res = await admitStudent(payload).unwrap();
      if (res.success && res.data?.credentials) {
        setCredentials(res.data.credentials);
        toast.success("Student admitted! Save the credentials below.");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to admit student");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (credentials) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-emerald-600">
            Student admitted successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Save these credentials now — they will not be shown again.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-card p-4">
              <Label className="text-xs text-muted-foreground">Student ID</Label>
              <div className="flex items-center justify-between">
                <p className="font-mono text-lg font-semibold">{credentials.studentId}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.studentId);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md border bg-card p-4">
              <Label className="text-xs text-muted-foreground">Initial Password</Label>
              <div className="flex items-center justify-between">
                <p className="font-mono text-lg font-semibold">{credentials.initialPassword}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.initialPassword);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/students")}>
              Back to list
            </Button>
            <Button onClick={() => router.push("/dashboard/students/new")}>
              Admit another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" {...register("nickname")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile *</Label>
            <Input id="mobile" {...register("mobile")} placeholder="01XXXXXXXXX" />
            {errors.mobile && <p className="text-sm text-destructive">{errors.mobile.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Blood Group *</Label>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((bg) => (
                      <SelectItem key={bg.value} value={bg.value}>
                        {bg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.bloodGroup && (
              <p className="text-sm text-destructive">{errors.bloodGroup.message}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="college">College</Label>
            <Input id="college" {...register("college")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardian Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fatherName">Father Name *</Label>
            <Input id="fatherName" {...register("fatherName")} />
            {errors.fatherName && (
              <p className="text-sm text-destructive">{errors.fatherName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fatherOccupation">Father Occupation *</Label>
            <Input id="fatherOccupation" {...register("fatherOccupation")} />
            {errors.fatherOccupation && (
              <p className="text-sm text-destructive">{errors.fatherOccupation.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fatherMobile">Father Mobile *</Label>
            <Input id="fatherMobile" {...register("fatherMobile")} placeholder="01XXXXXXXXX" />
            {errors.fatherMobile && (
              <p className="text-sm text-destructive">{errors.fatherMobile.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherName">Mother Name *</Label>
            <Input id="motherName" {...register("motherName")} />
            {errors.motherName && (
              <p className="text-sm text-destructive">{errors.motherName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherOccupation">Mother Occupation *</Label>
            <Input id="motherOccupation" {...register("motherOccupation")} />
            {errors.motherOccupation && (
              <p className="text-sm text-destructive">{errors.motherOccupation.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherMobile">Mother Mobile *</Label>
            <Input id="motherMobile" {...register("motherMobile")} placeholder="01XXXXXXXXX" />
            {errors.motherMobile && (
              <p className="text-sm text-destructive">{errors.motherMobile.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="addressVillage">Village *</Label>
            <Input id="addressVillage" {...register("addressVillage")} />
            {errors.addressVillage && (
              <p className="text-sm text-destructive">{errors.addressVillage.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressPostOffice">Post Office *</Label>
            <Input id="addressPostOffice" {...register("addressPostOffice")} />
            {errors.addressPostOffice && (
              <p className="text-sm text-destructive">{errors.addressPostOffice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressUpozila">Upazila *</Label>
            <Input id="addressUpozila" {...register("addressUpozila")} />
            {errors.addressUpozila && (
              <p className="text-sm text-destructive">{errors.addressUpozila.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressDistrict">District *</Label>
            <Input id="addressDistrict" {...register("addressDistrict")} />
            {errors.addressDistrict && (
              <p className="text-sm text-destructive">{errors.addressDistrict.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SSC Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sscInstitute">Institute *</Label>
            <Input id="sscInstitute" {...register("sscInstitute")} />
            {errors.sscInstitute && (
              <p className="text-sm text-destructive">{errors.sscInstitute.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Board *</Label>
            <Controller
              control={control}
              name="sscBoard"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {educationBoards.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sscPassingYear">Passing Year *</Label>
            <Input
              id="sscPassingYear"
              type="number"
              {...register("sscPassingYear", { valueAsNumber: true })}
            />
            {errors.sscPassingYear && (
              <p className="text-sm text-destructive">{errors.sscPassingYear.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sscGpa">GPA *</Label>
            <Input
              id="sscGpa"
              type="number"
              step="0.01"
              {...register("sscGpa", { valueAsNumber: true })}
            />
            {errors.sscGpa && (
              <p className="text-sm text-destructive">{errors.sscGpa.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course & Batch</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick the course, then a batch group. The day and time are filtered to that group's slots.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Course *</Label>
            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <Select onValueChange={handleCourseChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 && (
                      <SelectItem value="none" disabled>
                        No active courses available. Create one first.
                      </SelectItem>
                    )}
                    {courses.map((c) => (
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

          {selectedCourse && (
            <>
              {selectedCourse.batchDays && selectedCourse.batchDays.length > 0 && (
                <div className="space-y-2">
                  <Label>Batch Day *</Label>
                  <Controller
                    control={control}
                    name="batchDayId"
                    render={({ field }) => (
                      <Select onValueChange={handleBatchDayChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a batch day" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCourse.batchDays!.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} — {d.days.join(", ")} @ {d.times.join(", ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.batchDayId && (
                    <p className="text-sm text-destructive">{errors.batchDayId.message as string}</p>
                  )}
                </div>
              )}

              {selectedBatchDay && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedBatchDay.days.map((d) => (
                        <Badge key={d} variant="outline">{d}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Time *</Label>
                    <Controller
                      control={control}
                      name="batchTime"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedBatchDay.times.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.batchTime && (
                      <p className="text-sm text-destructive">{errors.batchTime.message}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <div className="font-medium mb-1">All available batch days:</div>
                <div className="space-y-1">
                  {selectedCourse.batchDays?.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{d.name}</Badge>
                      <span className="text-muted-foreground">{d.days.join(", ")}</span>
                      <span>@</span>
                      <span>{d.times.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoading || !selectedCourseId || !selectedBatchDayId}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Admit Student
        </Button>
      </div>
    </form>
  );
};

export default AdmitStudentForm;