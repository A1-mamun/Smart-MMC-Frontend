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
import { useGetActivePpsQuery } from "@/redux/features/pp/pp.api";
import { bloodGroups } from "@/constants/bloodGroups";
import { educationBoards } from "@/constants/boards";
import { formatBloodGroupLabel, formatBoardLabel } from "@/constants/labels";

const phoneRegex = /^01[3-9]\d{8}$/;

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  nickname: z.string().optional(),
  college: z.string().optional(),
  mobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  // Same relaxations as the admit form — keep the two in sync so admins
  // don't see a rule change between creating and editing a student.
  bloodGroup: z
    .enum([
      "A_POSITIVE",
      "A_NEGATIVE",
      "B_POSITIVE",
      "B_NEGATIVE",
      "AB_POSITIVE",
      "AB_NEGATIVE",
      "O_POSITIVE",
      "O_NEGATIVE",
    ])
    .optional()
    .nullable(),
  fatherName: z.string().min(2, "Father name is required"),
  fatherOccupation: z.string().min(2, "Required"),
  fatherMobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  motherName: z.string().min(2).optional().nullable().or(z.literal("")),
  motherOccupation: z.string().optional().nullable().or(z.literal("")),
  motherMobile: z
    .string()
    .regex(phoneRegex, "Invalid BD mobile number")
    .optional()
    .nullable()
    .or(z.literal("")),
  addressVillage: z.string().optional().nullable().or(z.literal("")),
  addressPostOffice: z.string().optional().nullable().or(z.literal("")),
  addressUpozila: z.string().min(1, "Required"),
  addressDistrict: z.string().min(1, "Required"),
  sscInstitute: z.string().min(1, "Required"),
  sscBoard: z
    .enum([
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
    ])
    .optional()
    .nullable(),
  sscPassingYear: z.number().min(2010).max(new Date().getFullYear()).optional().nullable(),
  sscGpa: z.number().min(0).max(5).optional().nullable(),
  // PP (referral) linkage — mirrors the admit form. Both
  // optional. Cross-field rule (positive ppFee requires ppId) is
  // enforced server-side by `updateStudentSchema.refine` so the
  // client doesn't need to duplicate the check.
  ppId: z.string().nullable().optional(),
  ppFee: z.coerce.number().min(0).nullable().optional(),
});

// `z.coerce.number()` widens the input to `unknown` so the user
// can type a numeric string in the form. RHF's zodResolver is
// strict about input vs output types when they diverge, so we
// thread the input type into `useForm` and keep the output
// type for the submit handler. `FormData` aliases the output
// so existing call sites (defaultValues, onSubmit, etc.) keep
// working with `number` not `unknown`.
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;
type FormData = FormOutput;

type Props = {
  studentId: string;
};

const EditStudentForm = ({ studentId }: Props) => {
  const router = useRouter();
  const { data, isLoading, refetch } = useGetStudentByIdQuery(studentId);
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [submitting, setSubmitting] = useState(false);

  // Active PP list — same source as the admit form so the picker
  // and the displayed names stay in sync. PPs are admin-curated
  // and soft-deleted on the PP module; we only ever show the
  // non-archived ones here.
  const { data: ppsData } = useGetActivePpsQuery();
  // Tolerate the admit form's `data.data` shape, but fall back to
  // a bare array in case the API ever changes the wrapper.
  const pps: { id: string; name: string }[] = Array.isArray(ppsData)
    ? ppsData
    : Array.isArray((ppsData as { data?: unknown })?.data)
      ? ((ppsData as { data: { id: string; name: string }[] }).data)
      : [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormOutput>({
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
      bloodGroup: undefined,
      sscBoard: undefined,
      // Optional numeric fields start undefined so the form accepts an
      // empty input without flagging it as invalid.
      sscPassingYear: undefined,
      sscGpa: undefined,
      // PP linkage — start cleared; hydration below repopulates
      // from the loaded student row.
      ppId: null,
      ppFee: null,
    },
  });

  // Hydrate the form when the student is loaded. `sscGpa` arrives from
  // the API as a Prisma Decimal (string). On edit it may be null/undefined
  // for newly-admitted students who haven't filled it in yet — pass it
  // through as undefined so the schema's `.optional().nullable()` accepts
  // it. Same for sscPassingYear, mother block, etc.
  useEffect(() => {
    if (!data?.data) return;
    const s = data.data;
    reset({
      name: s.user.name,
      nickname: s.user.nickname || "",
      college: s.college || "",
      mobile: s.mobile,
      bloodGroup: s.bloodGroup ?? undefined,
      fatherName: s.fatherName,
      fatherOccupation: s.fatherOccupation,
      fatherMobile: s.fatherMobile,
      motherName: s.motherName ?? "",
      motherOccupation: s.motherOccupation ?? "",
      motherMobile: s.motherMobile ?? "",
      addressVillage: s.addressVillage ?? "",
      addressPostOffice: s.addressPostOffice ?? "",
      addressUpozila: s.addressUpozila,
      addressDistrict: s.addressDistrict,
      sscInstitute: s.sscInstitute,
      sscBoard: s.sscBoard ?? undefined,
      sscPassingYear: s.sscPassingYear ?? undefined,
      sscGpa: s.sscGpa == null ? undefined : Number(s.sscGpa),
      // PP linkage. Prefer the populated `pp.id` from the include;
      // fall back to the bare `ppId` FK in case the include was
      // ever dropped. `ppFee` comes as a Decimal string from
      // Prisma — coerce through Number for the form's input.
      ppId: s.pp?.id ?? s.ppId ?? null,
      ppFee: s.ppFee == null ? null : Number(s.ppFee),
    });
  }, [data, reset]);

  const onSubmit = async (formData: FormData) => {
    setSubmitting(true);
    try {
      // Normalise "" / undefined / NaN to `null` for the now-optional
      // fields. The backend's `nullIfEmpty` would also do this, but
      // sending real nulls up front avoids any "should I send undefined?"
      // ambiguity in the wire payload and keeps analytics exports clean.
      const blankToNull = (v: unknown): string | null =>
        v === undefined || v === null || v === "" ? null : (v as string);
      const numBlankToNull = (v: unknown): number | null => {
        if (v === undefined || v === null) return null;
        if (typeof v === "number" && Number.isFinite(v)) return v;
        return null;
      };
      const data = {
        name: formData.name,
        nickname: formData.nickname || undefined,
        college: formData.college || undefined,
        mobile: formData.mobile,
        bloodGroup: formData.bloodGroup || null,
        fatherName: formData.fatherName,
        fatherOccupation: formData.fatherOccupation,
        fatherMobile: formData.fatherMobile,
        motherName: blankToNull(formData.motherName),
        motherOccupation: blankToNull(formData.motherOccupation),
        motherMobile: blankToNull(formData.motherMobile),
        addressVillage: blankToNull(formData.addressVillage),
        addressPostOffice: blankToNull(formData.addressPostOffice),
        addressUpozila: formData.addressUpozila,
        addressDistrict: formData.addressDistrict,
        sscInstitute: formData.sscInstitute,
        sscBoard: formData.sscBoard || null,
        sscPassingYear: numBlankToNull(formData.sscPassingYear),
        sscGpa: numBlankToNull(formData.sscGpa),
        // PP linkage — same shape as admit. Send `ppId` verbatim
        // (string or null) and `ppFee` as a number-or-null. The
        // backend's `updateStudentSchema.refine` rejects a
        // positive `ppFee` with a null `ppId` so admins can't
        // orphan a commission by mistake.
        ppId: formData.ppId ?? null,
        ppFee: numBlankToNull(formData.ppFee),
      };
      await updateStudent({ id: studentId, data }).unwrap();
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

  // PP-fee input is only shown when a PP is actually selected, to
  // mirror the admit form and avoid leaving a fee field with no
  // referrer attached.
  const selectedPpId = watch("ppId");
  const ppIdSelected =
    typeof selectedPpId === "string" && selectedPpId.length > 0;

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
            <Label htmlFor="bloodGroup">Blood Group</Label>

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

          {/* PP (referrer) — mirrors the admit form. The fee field
              is only shown when a PP is selected; clearing the
              picker hides the fee too so a stale fee can't ride
              along after the referrer is removed. */}
          <div className="space-y-2">
            <Label>PP (referrer)</Label>
            <Controller
              control={control}
              name="ppId"
              render={({ field }) => (
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === "__none__" ? null : v)
                  }
                  value={field.value ?? "__none__"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No PP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No PP —</SelectItem>
                    {pps.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.ppId && (
              <p className="text-sm text-destructive">
                {errors.ppId.message as string}
              </p>
            )}
          </div>
          {ppIdSelected && (
            <div className="space-y-2">
              <Label htmlFor="ppFee">PP Fee (৳)</Label>
              <Controller
                control={control}
                name="ppFee"
                render={({ field }) => (
                  <Input
                    id="ppFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 500"
                    // z.coerce.number() makes the schema's input
                    // type `unknown`, so the Controller field's
                    // value is `unknown` here — coerce to a number
                    // (or empty string for empty input) for the
                    // controlled input.
                    value={
                      field.value === null || field.value === undefined
                        ? ""
                        : typeof field.value === "number"
                          ? field.value
                          : typeof field.value === "string"
                            ? field.value
                            : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        field.onChange(null);
                        return;
                      }
                      const n = Number(raw);
                      field.onChange(Number.isFinite(n) ? n : null);
                    }}
                  />
                )}
              />
              {errors.ppFee && (
                <p className="text-sm text-destructive">
                  {errors.ppFee.message as string}
                </p>
              )}
            </div>
          )}

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
            <Label htmlFor="motherName">Mother Name</Label>
            <Input id="motherName" {...register("motherName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherOccupation">Mother Occupation</Label>
            <Input id="motherOccupation" {...register("motherOccupation")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherMobile">Mother Mobile</Label>
            <Input
              id="motherMobile"
              {...register("motherMobile")}
              placeholder="01XXXXXXXXX"
            />
            {errors.motherMobile && (
              <p className="text-sm text-destructive">
                {errors.motherMobile.message as string}
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
            <Label htmlFor="addressVillage">Village</Label>
            <Input id="addressVillage" {...register("addressVillage")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressPostOffice">Post Office</Label>
            <Input id="addressPostOffice" {...register("addressPostOffice")} />
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
            <Label htmlFor="sscBoard">Board</Label>

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
            <Label htmlFor="sscPassingYear">Passing Year</Label>
            <Input
              id="sscPassingYear"
              type="number"
              {...register("sscPassingYear", { valueAsNumber: true })}
            />
            {errors.sscPassingYear && (
              <p className="text-sm text-destructive">
                {errors.sscPassingYear.message as string}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sscGpa">GPA</Label>
            <Input
              id="sscGpa"
              type="number"
              step="0.01"
              {...register("sscGpa", { valueAsNumber: true })}
            />
            {errors.sscGpa && (
              <p className="text-sm text-destructive">
                {errors.sscGpa.message as string}
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
