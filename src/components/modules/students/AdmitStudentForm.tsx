"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Copy, Search } from "lucide-react";
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
import {
  useAdmitStudentMutation,
  useEnrollExistingStudentMutation,
  useGetAllStudentsQuery,
} from "@/redux/features/student/student";
import { educationBoards } from "@/constants/boards";
import { bloodGroups } from "@/constants/bloodGroups";
import { formatCourseLabel } from "@/constants/labels";
import { TStudent, TStudentCredentials, TAdmitStudentPayload } from "@/types/student";

const phoneRegex = /^01[3-9]\d{8}$/;

// Shared schema — kept loose (everything optional) so the same shape
// works for both the "new student" and "existing student" modes.
// Required-field validation for the new-mode path is handled in
// `onSubmit` (we don't want the schema to choke on the empty default
// values when the personal block is hidden in existing mode).
const schema = z.object({
  name: z.string().optional(),
  nickname: z.string().optional(),
  college: z.string().optional(),
  mobile: z.string().optional(),
  bloodGroup: z.string().nullable().optional(),
  fatherName: z.string().optional(),
  fatherOccupation: z.string().optional(),
  fatherMobile: z.string().optional(),
  motherName: z.string().nullable().optional(),
  motherOccupation: z.string().nullable().optional(),
  motherMobile: z.string().nullable().optional(),
  addressVillage: z.string().nullable().optional(),
  addressPostOffice: z.string().nullable().optional(),
  addressUpozila: z.string().optional(),
  addressDistrict: z.string().optional(),
  sscInstitute: z.string().optional(),
  sscBoard: z.string().nullable().optional(),
  // Typed as `string` (not `number`) because the corresponding
  // inputs are unmounted in existing mode — coercing an empty value
  // with `valueAsNumber: true` yields `NaN`, which fails
  // `z.number()`. The new-mode submit handler coerces them to
  // numbers (or null) at submit time via `numBlankToNull`.
  sscPassingYear: z.string().optional(),
  sscGpa: z.string().optional(),
  courseId: z.string().uuid("Select a course"),
  batchDayId: z.string().uuid("Select a batch day"),
  batchTime: z
    .string()
    .trim()
    .regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, 'Time must look like "7:00 AM"'),
});

// Strict validator for the new-mode payload — used in `onSubmit` to
// surface the original required-field errors that the loose schema no
// longer enforces.
const newStudentPayloadSchema = z.object({
  mobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  name: z.string().min(2, "Name is required"),
  fatherName: z.string().min(2, "Father name is required"),
  fatherOccupation: z.string().min(2, "Required"),
  fatherMobile: z.string().regex(phoneRegex, "Invalid BD mobile number"),
  addressUpozila: z.string().min(1, "Required"),
  addressDistrict: z.string().min(1, "Required"),
  sscInstitute: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

const AdmitStudentForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `?mode=existing` in the URL pre-selects the "Existing student"
  // branch. Lets us deep-link from a future "Enroll existing" button
  // on the students list page without needing a separate route.
  const initialMode: "new" | "existing" =
    searchParams.get("mode") === "existing" ? "existing" : "new";
  const [mode, setMode] = useState<"new" | "existing">(initialMode);

  const [admitStudent, { isLoading: isAdmitting }] = useAdmitStudentMutation();
  const [enrollExisting, { isLoading: isEnrolling }] =
    useEnrollExistingStudentMutation();
  const { data: coursesData } = useGetAllCoursesQuery({ isActive: true, limit: 100 });
  const courses = useMemo(() => coursesData?.data || [], [coursesData]);
  const [credentials, setCredentials] = useState<TStudentCredentials | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Existing-student lookup state ─────────────────────────────────
  // `mobileLookup` is the debounced value fed to the students query;
  // `mobileRaw` is the raw input so we don't lose what the admin typed
  // mid-debounce. `matchedStudent` is the selected row (used as the
  // payload source for the enroll-existing submit).
  const [mobileRaw, setMobileRaw] = useState("");
  const [mobileLookup, setMobileLookup] = useState("");
  const [matchedStudent, setMatchedStudent] = useState<TStudent | null>(null);
  // 400ms debounce on the mobile lookup so we don't hammer the backend
  // on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setMobileLookup(mobileRaw.trim()), 400);
    return () => clearTimeout(handle);
  }, [mobileRaw]);
  const isValidMobile = phoneRegex.test(mobileLookup);
  const { data: lookupData, isFetching: isLookingUp } = useGetAllStudentsQuery(
    { searchTerm: mobileLookup, limit: 5 },
    { skip: !isValidMobile || mode !== "existing" },
  );
  const lookupResults = useMemo(
    () => lookupData?.data ?? [],
    [lookupData],
  );

  // When the admin switches modes, reset transient state so the
  // existing-branch UI doesn't leak into the new-branch form (and
  // vice versa). The shared form values (mobile / course / batch)
  // are preserved on purpose — re-entering them after every mode
  // toggle would be annoying.
  useEffect(() => {
    setMatchedStudent(null);
    setMobileRaw("");
    setMobileLookup("");
  }, [mode]);

  // When a student is matched in existing mode, scroll the Course &
  // Batch card into view so the admin immediately sees where to go
  // next (instead of being stranded on the find-student card).
  const courseBatchCardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (matchedStudent && mode === "existing") {
      // Defer to next tick so the matched-student card has finished
      // rendering and the layout reflects the new height.
      const t = setTimeout(() => {
        courseBatchCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [matchedStudent, mode]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    // Loose schema: every personal/guardian/address/SSC field is
    // optional so the same shape works for both the "new" and
    // "existing" modes (existing mode hides the personal block).
    // Strict required-field validation for the new-mode path lives
    // in `onSubmit` via `newStudentPayloadSchema`. The schema still
    // enforces `courseId` / `batchDayId` / `batchTime` formats so
    // garbage in those fields surfaces inline + via the onError
    // callback below.
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      nickname: "",
      college: "",
      mobile: "",
      // Optional — starts undefined so the Select shows the placeholder
      // "Select" until the admin picks a value.
      bloodGroup: undefined,
      fatherName: "",
      fatherOccupation: "",
      fatherMobile: "",
      // Mother block: starts empty strings; the schema accepts "" or null.
      motherName: "",
      motherOccupation: "",
      motherMobile: "",
      // Address: only upazila/district are required. Village/post office
      // default to empty and can be left blank.
      addressVillage: "",
      addressPostOffice: "",
      addressUpozila: "",
      addressDistrict: "",
      sscInstitute: "",
      // SSC optional fields default to undefined so the controller can
      // forward `null` straight through; the form will fill them in once
      // the admin picks values.
      sscBoard: undefined,
      sscPassingYear: undefined,
      sscGpa: undefined,
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
    // eslint-disable-next-line no-console
    console.log("[AdmitStudentForm] submit fired", {
      mode,
      matchedStudent: matchedStudent?.user?.studentId ?? null,
      courseId: data.courseId,
      batchDayId: data.batchDayId,
      batchTime: data.batchTime,
    });
    try {
      // ── Existing-student branch ────────────────────────────────────
      // Sends only { mobile, courseId, batchDayId, batchTime, nickname? }
      // — the backend matches the existing profile and reuses it.
      if (mode === "existing") {
        if (!matchedStudent) {
          toast.error("Find and select a student first (type a mobile above)");
          setIsSubmitting(false);
          return;
        }
        if (!data.courseId || !data.batchDayId || !data.batchTime) {
          toast.error("Pick a course and batch before enrolling");
          setIsSubmitting(false);
          return;
        }
        // eslint-disable-next-line no-console
        console.log("[AdmitStudentForm] dispatching enrollExisting", {
          mobile: matchedStudent.mobile,
          courseId: data.courseId,
          batchDayId: data.batchDayId,
          batchTime: data.batchTime,
        });
        const res = await enrollExisting({
          mobile: matchedStudent.mobile,
          courseId: data.courseId,
          batchDayId: data.batchDayId,
          batchTime: data.batchTime,
        }).unwrap();
        if (res.success && res.data?.credentials) {
          setCredentials(res.data.credentials);
          toast.success("Existing student added to the new course");
        }
        return;
      }

      // ── New-student branch (original behaviour) ────────────────────
      // The form schema is loose (so existing-mode can hide the
      // personal block). Re-validate the new-mode payload against the
      // strict schema and surface errors as a toast instead of relying
      // on RHF field-level errors — this keeps the existing UX intact
      // for admins filling out the new-student form.
      const parsed = newStudentPayloadSchema.safeParse(data);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        toast.error(first?.message ?? "Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Helper: treat "" / undefined / null as `null` for optional fields
      // so the backend's `nullIfEmpty` helper receives a real null and the
      // DB stores NULL instead of "" (cleaner for analytics / exports).
      const blankToNull = (v: unknown): string | null =>
        v === undefined || v === null || v === "" ? null : (v as string);
      const numBlankToNull = (v: unknown): number | null => {
        if (v === undefined || v === null) return null;
        // Accept both already-coerced numbers and the raw string from
        // the form (we removed `valueAsNumber: true` so empty / typed
        // values arrive here as strings, not NaN).
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed === "") return null;
          const parsed = Number(trimmed);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };
      const payload = {
        name: data.name,
        nickname: data.nickname || undefined,
        college: data.college || undefined,
        mobile: data.mobile,
        bloodGroup: data.bloodGroup || null,
        fatherName: data.fatherName,
        fatherOccupation: data.fatherOccupation,
        fatherMobile: data.fatherMobile,
        motherName: blankToNull(data.motherName),
        motherOccupation: blankToNull(data.motherOccupation),
        motherMobile: blankToNull(data.motherMobile),
        addressVillage: blankToNull(data.addressVillage),
        addressPostOffice: blankToNull(data.addressPostOffice),
        addressUpozila: data.addressUpozila,
        addressDistrict: data.addressDistrict,
        sscInstitute: data.sscInstitute,
        sscBoard: data.sscBoard || null,
        sscPassingYear: numBlankToNull(data.sscPassingYear),
        sscGpa: numBlankToNull(data.sscGpa),
        courseId: data.courseId,
        batchDayId: data.batchDayId,
        batchTime: data.batchTime,
      };
      const res = await admitStudent(payload as TAdmitStudentPayload).unwrap();
      if (res.success && res.data?.credentials) {
        setCredentials(res.data.credentials);
        // Two toast paths: brand-new admit (credentials to save) vs.
        // existing-profile re-enrolment (no new login info). The
        // credentials card branches on the same flag.
        toast.success(
          res.data.credentials.alreadyEnrolled
            ? "Existing student added to the new course"
            : "Student admitted! Save the credentials below.",
        );
      }
    } catch (err: any) {
      // RTK Query's error shape varies:
      //   - HTTP 4xx/5xx with JSON body: { status, data: { success, message, ... } }
      //   - Network / CORS / parse failure: { status: 'FETCH_ERROR'|'PARSING_ERROR', error: '...' }
      // Try every plausible message location so the toast always shows
      // something useful instead of a silent failure.
      const message =
        err?.data?.message ||
        err?.data?.error ||
        err?.error ||
        err?.message ||
        (typeof err?.data === "string" ? err.data : null) ||
        "Failed to admit student. See the console for details.";
      // Always log so we can diagnose silent toasts in the browser console.
      // eslint-disable-next-line no-console
      console.error("[AdmitStudentForm] submit error:", err);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (credentials) {
    // The backend returns `initialPassword: null` + `alreadyEnrolled: true`
    // when an admin re-admits an existing student into a new course.
    // In that case the User/Student profile is reused, no new login is
    // created, and the only new credential we show is the per-enrollment
    // `studentCourseId`.
    const isExisting = Boolean(credentials.alreadyEnrolled);
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-emerald-600">
            {isExisting
              ? "Added to a new course"
              : "Student admitted successfully"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={
              isExisting
                ? "rounded-md border bg-blue-50 dark:bg-blue-950/20 p-4"
                : "rounded-md border bg-amber-50 dark:bg-amber-950/20 p-4"
            }
          >
            <p
              className={
                isExisting
                  ? "text-sm font-semibold text-blue-800 dark:text-blue-200"
                  : "text-sm font-semibold text-amber-800 dark:text-amber-200"
              }
            >
              {isExisting
                ? "This student already had a profile with us — we've added them to the new course and stamped a fresh per-enrollment ID. Their existing login (mobile number) is unchanged."
                : "Save these credentials now — they will not be shown again."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-card p-4">
              <Label className="text-xs text-muted-foreground">
                {isExisting ? "Per-Enrollment ID" : "Student ID"}
              </Label>
              <div className="flex items-center justify-between">
                <p className="font-mono text-lg font-semibold">
                  {isExisting
                    ? credentials.studentCourseId ?? credentials.studentId
                    : credentials.studentId}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const value = isExisting
                      ? (credentials.studentCourseId ?? credentials.studentId)
                      : credentials.studentId;
                    navigator.clipboard.writeText(value);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md border bg-card p-4">
              <Label className="text-xs text-muted-foreground">
                {isExisting ? "Login Mobile" : "Initial Password"}
              </Label>
              <div className="flex items-center justify-between">
                <p className="font-mono text-lg font-semibold">
                  {isExisting ? "—" : credentials.initialPassword}
                </p>
                {!isExisting && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.initialPassword!);
                      toast.success("Copied!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
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
    <form
      onSubmit={handleSubmit(onSubmit, (validationErrors) => {
        // RHF blocks `onSubmit` when the resolver finds issues. Surface
        // the FIRST failure as a toast so the admin isn't stuck staring
        // at a button that does nothing on click. In existing mode the
        // hidden personal fields would otherwise dominate the error
        // list — filter those out so we surface a useful message.
        const firstIssue =
          Object.values(validationErrors ?? {})
            .filter((e: any) => e && e.message)
            .map((e: any) => ({ path: e.ref?.name ?? e.path, message: e.message }))[0] ||
          null;
        const msg =
          firstIssue?.path && firstIssue.path !== "courseId" &&
          firstIssue.path !== "batchDayId" && firstIssue.path !== "batchTime"
            ? `Form error: ${firstIssue.message}`
            : mode === "existing"
              ? "Pick a course and batch before enrolling"
              : firstIssue?.message ?? "Please fill in all required fields";
        // eslint-disable-next-line no-console
        console.warn("[AdmitStudentForm] validation errors:", validationErrors);
        toast.error(msg);
      })}
      className="space-y-6"
    >
      {/* ── Mode toggle ─────────────────────────────────────────────
          Two-way switch between admitting a brand-new student and
          enrolling an existing one in another course. In existing mode
          the personal/guardian/address/SSC cards are hidden — only the
          mobile lookup + course/batch are needed. */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Are you admitting…</p>
              <p className="text-xs text-muted-foreground">
                Pick "Existing student" if their profile is already on file — only the course + batch are needed.
              </p>
            </div>
            <div className="inline-flex rounded-md border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setMode("new")}
                className={
                  "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors " +
                  (mode === "new"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
                aria-pressed={mode === "new"}
              >
                New student
              </button>
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={
                  "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors " +
                  (mode === "existing"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
                aria-pressed={mode === "existing"}
              >
                Existing student
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {mode === "existing" && (
        <Card>
          <CardHeader>
            <CardTitle>Find Existing Student</CardTitle>
            <p className="text-sm text-muted-foreground">
              Type the student's mobile number. We'll look them up and confirm before creating a new enrollment.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="existing-mobile">Mobile</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="existing-mobile"
                    className="pl-8"
                    placeholder="01XXXXXXXXX"
                    value={mobileRaw}
                    onChange={(e) => setMobileRaw(e.target.value)}
                    disabled={!!matchedStudent}
                  />
                </div>
                {matchedStudent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMatchedStudent(null)}
                  >
                    Change
                  </Button>
                )}
              </div>
              {mobileRaw && !isValidMobile && (
                <p className="text-xs text-muted-foreground">
                  Keep typing — needs 11 digits (01XXXXXXXXX).
                </p>
              )}
            </div>

            {/* Lookup results: debounced 400ms via useEffect above. */}
            {!matchedStudent && isValidMobile && (
              <div className="rounded-md border bg-muted/20">
                {isLookingUp && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching…
                  </div>
                )}
                {!isLookingUp && lookupResults.length === 0 && (
                  <div className="space-y-2 px-3 py-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No student found with this mobile. Double-check the number or
                      switch to "New student" if they haven't been admitted before.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setMode("new")}
                    >
                      Switch to New student
                    </Button>
                  </div>
                )}
                {!isLookingUp && lookupResults.length > 0 && (
                  <ul className="divide-y">
                    {lookupResults.map((s) => {
                      const enrolled = s.studentCourses ?? [];
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                            onClick={() => {
                              setMatchedStudent(s);
                              // Lock the mobile field to the matched
                              // student's canonical mobile — admins
                              // may have typed a sibling's number.
                              if (s.mobile) setMobileRaw(s.mobile);
                            }}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="font-medium">
                                {s.user.name}
                                {s.user.nickname ? ` (${s.user.nickname})` : ""}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {s.user.studentId}
                              </span>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{s.mobile}</span>
                              {enrolled.length > 0 && (
                                <span>
                                  • Already in:{" "}
                                  {enrolled
                                    .map((sc) => sc.course?.name ?? "course")
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {matchedStudent && (
              <div className="rounded-md border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Selected: {matchedStudent.user.name}
                    {matchedStudent.user.nickname
                      ? ` (${matchedStudent.user.nickname})`
                      : ""}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Mobile: {matchedStudent.mobile} · Student ID:{" "}
                    <span className="font-mono">{matchedStudent.user.studentId}</span>
                  </p>
                  {matchedStudent.studentCourses &&
                    matchedStudent.studentCourses.length > 0 && (
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Currently enrolled in:{" "}
                        {matchedStudent.studentCourses
                          .map((sc) => formatCourseLabel(sc.course?.name ?? ""))
                          .join(", ")}
                      </p>
                    )}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Now pick a course + batch below and click <strong>Enroll in Course</strong> to finish.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "new" && (
        <>
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
            <Label>Blood Group</Label>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
            <Label htmlFor="motherName">Mother Name</Label>
            <Input id="motherName" {...register("motherName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherOccupation">Mother Occupation</Label>
            <Input id="motherOccupation" {...register("motherOccupation")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherMobile">Mother Mobile</Label>
            <Input id="motherMobile" {...register("motherMobile")} placeholder="01XXXXXXXXX" />
            {errors.motherMobile && (
              <p className="text-sm text-destructive">{errors.motherMobile.message as string}</p>
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
            <Label>Board</Label>
            <Controller
              control={control}
              name="sscBoard"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
            <Label htmlFor="sscPassingYear">Passing Year</Label>
            <Input
              id="sscPassingYear"
              type="number"
              // No `valueAsNumber: true` here: in existing mode the
              // input is unmounted, and an empty string coerced with
              // valueAsNumber becomes `NaN`, which fails the loose
              // schema. Coerce to number at submit time via
              // `numBlankToNull` instead so both modes share one path.
              {...register("sscPassingYear")}
            />
            {errors.sscPassingYear && (
              <p className="text-sm text-destructive">{errors.sscPassingYear.message as string}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sscGpa">GPA</Label>
            <Input
              id="sscGpa"
              type="number"
              step="0.01"
              // See note above for `sscPassingYear`.
              {...register("sscGpa")}
            />
            {errors.sscGpa && (
              <p className="text-sm text-destructive">{errors.sscGpa.message as string}</p>
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}

      <Card ref={courseBatchCardRef}>
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
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            isAdmitting ||
            isEnrolling ||
            // New-mode strict disable (RHF will surface field errors).
            (mode === "new" && (!selectedCourseId || !selectedBatchDayId))
            // Existing-mode keeps the button clickable so admins get
            // a clear toast if anything's missing, rather than a
            // silently-disabled button.
          }
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "existing" ? "Enroll in Course" : "Admit Student"}
        </Button>
      </div>
    </form>
  );
};

export default AdmitStudentForm;