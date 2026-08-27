"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetStudentByIdQuery,
  useUpdateStudentMutation,
} from "@/redux/features/student/student";
import { bloodGroups } from "@/constants/bloodGroups";
import { educationBoards } from "@/constants/boards";
import { formatBloodGroupLabel, formatBoardLabel } from "@/constants/labels";

const phoneRegex = /^01[3-9]\d{8}$/;

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  nickname: z.string().optional(),
  college: z.string().optional(),
  mobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  bloodGroup: z.enum([
    "A_POSITIVE",
    "A_NEGATIVE",
    "B_POSITIVE",
    "B_NEGATIVE",
    "AB_POSITIVE",
    "AB_NEGATIVE",
    "O_POSITIVE",
    "O_NEGATIVE",
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
    "DHAKA",
    "CHITTAGONG",
    "RAJSHAHI",
    "COMILLA",
    "SYLHET",
    "BARISAL",
    "JESSORE",
    "MYMENSINGH",
    "MADRASAH",
    "TECHNICAL",
  ]),
  sscPassingYear: z.number().min(2010).max(new Date().getFullYear()),
  sscGpa: z.number().min(0).max(5),
});

type FormData = z.infer<typeof schema>;

type Props = {
  studentId: string;
};

const EditStudentForm = ({ studentId }: Props) => {
  const router = useRouter();
  const { data, isLoading, refetch } = useGetStudentByIdQuery(studentId);
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
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
      bloodGroup: undefined,
      sscBoard: undefined,
    },
  });

  // Hydrate the form when the student is loaded.
  useEffect(() => {
    if (!data?.data) return;
    const s = data.data;
    reset({
      name: s.user.name,
      nickname: s.user.nickname || "",
      college: s.college || "",
      mobile: s.mobile,
      bloodGroup: s.bloodGroup ?? "",
      fatherName: s.fatherName,
      fatherOccupation: s.fatherOccupation,
      fatherMobile: s.fatherMobile,
      motherName: s.motherName,
      motherOccupation: s.motherOccupation,
      motherMobile: s.motherMobile,
      addressVillage: s.addressVillage,
      addressPostOffice: s.addressPostOffice,
      addressUpozila: s.addressUpozila,
      addressDistrict: s.addressDistrict,
      sscInstitute: s.sscInstitute,
      sscBoard: s.sscBoard ?? "",
      sscPassingYear: s.sscPassingYear,
      sscGpa: Number(s.sscGpa),
    });
  }, [data, reset]);

  const onSubmit = async (formData: FormData) => {
    setSubmitting(true);
    try {
      await updateStudent({
        id: studentId,
        data: formData,
      }).unwrap();
      toast.success("Student updated");
      await refetch();
      router.push(`/dashboard/students/${studentId}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !data?.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  console.log("student data", data.data);

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
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" {...register("nickname")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile *</Label>
            <Input
              id="mobile"
              {...register("mobile")}
              placeholder="01XXXXXXXXX"
            />
            {errors.mobile && (
              <p className="text-sm text-destructive">
                {errors.mobile.message}
              </p>
            )}
          </div>
          {/* <div className="space-y-2">
            <Label>Blood Group *</Label>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => {
                const selected = bloodGroups.find(
                  (bg) => bg.value === field.value,
                );
                return (
                  <Select
                    key={`bloodGroup-${data?.data?.id ?? "empty"}`}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group">
                        {selected?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {bloodGroups.map((bg) => (
                        <SelectItem key={bg.value} value={bg.value}>
                          {bg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {errors.bloodGroup && (
              <p className="text-sm text-destructive">
                {errors.bloodGroup.message}
              </p>
            )}
          </div> */}

          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood Group *</Label>

            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <select
                  id="bloodGroup"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select blood group
                  </option>
                  {bloodGroups.map((bg) => (
                    <option key={bg.value} value={bg.value}>
                      {bg.label}
                    </option>
                  ))}
                </select>
              )}
            />

            {errors.bloodGroup && (
              <p className="text-sm text-destructive">
                {errors.bloodGroup.message}
              </p>
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
              <p className="text-sm text-destructive">
                {errors.fatherName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fatherOccupation">Father Occupation *</Label>
            <Input id="fatherOccupation" {...register("fatherOccupation")} />
            {errors.fatherOccupation && (
              <p className="text-sm text-destructive">
                {errors.fatherOccupation.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fatherMobile">Father Mobile *</Label>
            <Input
              id="fatherMobile"
              {...register("fatherMobile")}
              placeholder="01XXXXXXXXX"
            />
            {errors.fatherMobile && (
              <p className="text-sm text-destructive">
                {errors.fatherMobile.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherName">Mother Name *</Label>
            <Input id="motherName" {...register("motherName")} />
            {errors.motherName && (
              <p className="text-sm text-destructive">
                {errors.motherName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherOccupation">Mother Occupation *</Label>
            <Input id="motherOccupation" {...register("motherOccupation")} />
            {errors.motherOccupation && (
              <p className="text-sm text-destructive">
                {errors.motherOccupation.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherMobile">Mother Mobile *</Label>
            <Input
              id="motherMobile"
              {...register("motherMobile")}
              placeholder="01XXXXXXXXX"
            />
            {errors.motherMobile && (
              <p className="text-sm text-destructive">
                {errors.motherMobile.message}
              </p>
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
              <p className="text-sm text-destructive">
                {errors.addressVillage.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressPostOffice">Post Office *</Label>
            <Input id="addressPostOffice" {...register("addressPostOffice")} />
            {errors.addressPostOffice && (
              <p className="text-sm text-destructive">
                {errors.addressPostOffice.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressUpozila">Upazila *</Label>
            <Input id="addressUpozila" {...register("addressUpozila")} />
            {errors.addressUpozila && (
              <p className="text-sm text-destructive">
                {errors.addressUpozila.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressDistrict">District *</Label>
            <Input id="addressDistrict" {...register("addressDistrict")} />
            {errors.addressDistrict && (
              <p className="text-sm text-destructive">
                {errors.addressDistrict.message}
              </p>
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
              <p className="text-sm text-destructive">
                {errors.sscInstitute.message}
              </p>
            )}
          </div>
          {/* <div className="space-y-2">
            <Label>Board *</Label>
            <Controller
              control={control}
              name="sscBoard"
              render={({ field }) => {
                const selected = educationBoards.find(
                  (b) => b.value === field.value,
                );
                return (
                  <Select
                    key={`sscBoard-${data?.data?.id ?? "empty"}`}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select board">
                        {selected?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {educationBoards.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          </div> */}
          <div className="space-y-2">
            <Label htmlFor="sscBoard">Board *</Label>

            <Controller
              control={control}
              name="sscBoard"
              render={({ field }) => (
                <select
                  id="sscBoard"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select board
                  </option>
                  {educationBoards.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              )}
            />

            {errors.sscBoard && (
              <p className="text-sm text-destructive">
                {errors.sscBoard.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sscPassingYear">Passing Year *</Label>
            <Input
              id="sscPassingYear"
              type="number"
              {...register("sscPassingYear", { valueAsNumber: true })}
            />
            {errors.sscPassingYear && (
              <p className="text-sm text-destructive">
                {errors.sscPassingYear.message}
              </p>
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
              <p className="text-sm text-destructive">
                {errors.sscGpa.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/students/${studentId}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || updating || !isDirty}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EditStudentForm;
