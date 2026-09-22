// "use client";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useForm, Controller } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { toast } from "sonner";
// import {
//   Loader2,
//   Copy,
//   Search,
//   CheckCircle2,
//   Wallet,
//   ListChecks,
//   UserPlus,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { useGetAllCoursesQuery } from "@/redux/features/course/course";
// import {
//   useAdmitStudentMutation,
//   useEnrollExistingStudentMutation,
//   useGetAllStudentsQuery,
// } from "@/redux/features/student/student";
// import RecordPaymentModal from "@/components/modules/payments/RecordPaymentModal";
// import { educationBoards } from "@/constants/boards";
// import { bloodGroups } from "@/constants/bloodGroups";
// import { formatCourseLabel } from "@/constants/labels";
// import {
//   TStudent,
//   TStudentCredentials,
//   TAdmitStudentPayload,
// } from "@/types/student";

// const phoneRegex = /^01[3-9]\d{8}$/;

// // Shared schema — kept loose (everything optional) so the same shape
// // works for both the "new student" and "existing student" modes.
// // Required-field validation for the new-mode path is handled in
// // `onSubmit` (we don't want the schema to choke on the empty default
// // values when the personal block is hidden in existing mode).
// // "Skip if empty" validator pattern: each optional field's refine
// // bails out when the value is undefined / null / whitespace-empty,
// // so admins can leave the field blank without triggering an error.
// // The format check only fires when the admin typed something — and
// // when it does, the error flows into `errors.<field>` and renders at
// // the bottom of that field, not as a transient toast.
// const isBlank = (v: unknown): boolean =>
//   v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// const optionalBounded = (max: number, msg: string) =>
//   z
//     .string()
//     .nullable()
//     .optional()
//     .refine((v) => isBlank(v) || (v as string).length <= max, { message: msg });

// // Required only when the mode is "new" (i.e. when the personal
// // fields are actually visible in the form). In "existing" mode
// // those inputs are unmounted but RHF still holds the registered
// // values, so the schema must NOT require them or every existing-mode
// // submit will fail with phantom required-field errors.
// //
// // The mode is captured directly into the closure here (not read
// // from a module-level flag) so the validator can't get out of sync
// // if `buildSchema` is invoked concurrently with a validation pass
// // — each schema build produces its own self-contained closure.
// const requiredInNewMode =
//   (minLen: number, msg: string) => (mode: "new" | "existing") =>
//     z
//       .string()
//       .nullable()
//       .optional()
//       .refine(
//         (v) =>
//           mode !== "new" ||
//           (!isBlank(v) && (v as string).trim().length >= minLen),
//         { message: msg },
//       );

// // Format-only validator that runs on every keystroke once the form
// // has been touched/submitted. Does NOT enforce required-ness —
// // that's the responsibility of the schema rules layered in via
// // `requiredInNewMode`. Used for fields where the format check is
// // the only thing we care about (e.g. optional motherMobile).
// const optionalPhoneFormat = () =>
//   z
//     .string()
//     .nullable()
//     .optional()
//     .refine((v) => isBlank(v) || phoneRegex.test(v as string), {
//       message: "Invalid BD mobile number",
//     });

// const buildSchema = (mode: "new" | "existing") => {
//   return z.object({
//     // ── Personal — required only in new mode ─────────────────────
//     name: requiredInNewMode(2, "Name is required")(mode),
//     nickname: optionalBounded(60, "Nickname is too long (max 60 characters)"),
//     college: optionalBounded(
//       120,
//       "College name is too long (max 120 characters)",
//     ),
//     // Mobile is a "required (in new mode) + format-validated"
//     // combo. The required check enforces "non-blank, length >= 11"
//     // (BD mobile format requires 11 digits), and the chained
//     // `.refine` adds the strict regex on top. Both error messages
//     // are independent — RHF surfaces whichever one fires.
//     mobile: requiredInNewMode(
//       11,
//       "Mobile is required",
//     )(mode).refine((v) => isBlank(v) || phoneRegex.test(v as string), {
//       message: "Invalid BD mobile number",
//     }),
//     bloodGroup: z.string().nullable().optional(),
//     // ── Guardian ────────────────────────────────────────────────
//     fatherName: requiredInNewMode(2, "Father name is required")(mode),
//     fatherOccupation: requiredInNewMode(2, "Required")(mode),
//     fatherMobile: requiredInNewMode(
//       11,
//       "Father mobile is required",
//     )(mode).refine((v) => isBlank(v) || phoneRegex.test(v as string), {
//       message: "Invalid BD mobile number",
//     }),
//     motherName: optionalBounded(
//       80,
//       "Mother name is too long (max 80 characters)",
//     ),
//     motherOccupation: optionalBounded(
//       80,
//       "Mother occupation is too long (max 80 characters)",
//     ),
//     motherMobile: optionalPhoneFormat(),
//     // ── Address ─────────────────────────────────────────────────
//     addressVillage: optionalBounded(
//       120,
//       "Village name is too long (max 120 characters)",
//     ),
//     addressPostOffice: optionalBounded(
//       80,
//       "Post office name is too long (max 80 characters)",
//     ),
//     addressUpozila: requiredInNewMode(1, "Required")(mode),
//     addressDistrict: requiredInNewMode(1, "Required")(mode),
//     // ── SSC ──────────────────────────────────────────────────────
//     sscInstitute: requiredInNewMode(1, "Required")(mode),
//     sscBoard: z.string().nullable().optional(),
//     // Typed as `string` (not `number`) because the corresponding
//     // inputs are unmounted in existing mode — coercing an empty
//     // value with `valueAsNumber: true` yields `NaN`, which fails
//     // `z.number()`. The new-mode submit handler coerces them to
//     // numbers (or null) at submit time via `numBlankToNull`.
//     sscPassingYear: z
//       .string()
//       .optional()
//       .refine(
//         (v) => {
//           if (isBlank(v)) return true;
//           const trimmed = (v as string).trim();
//           if (!/^\d{4}$/.test(trimmed)) return false;
//           const year = Number(trimmed);
//           // Match the backend's student.validation.ts bounds:
//           // 2010 → now.
//           const thisYear = new Date().getFullYear();
//           return year >= 2010 && year <= thisYear;
//         },
//         {
//           message: `Year must be between 2010 and ${new Date().getFullYear()} (e.g. ${new Date().getFullYear()})`,
//         },
//       ),
//     sscGpa: z
//       .string()
//       .optional()
//       .refine(
//         (v) => {
//           if (isBlank(v)) return true;
//           const n = Number(v);
//           return Number.isFinite(n) && n >= 0 && n <= 5;
//         },
//         { message: "GPA must be a number between 0 and 5" },
//       ),
//     // ── Course / batch — required in BOTH modes ────────────────
//     courseId: z.string().uuid("Select a course"),
//     batchDayId: z.string().uuid("Select a batch day"),
//     batchTime: z
//       .string()
//       .trim()
//       .regex(
//         /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
//         'Time must look like "7:00 AM"',
//       ),
//   });
// };

// // Inferred from the strict (new-mode) build so the type system knows
// // required fields exist. The runtime schema swaps required ↔ optional
// // based on `mode` but the field SHAPE is identical in both modes, so
// // the FormData type is stable.
// type FormData = z.infer<ReturnType<typeof buildSchema>>;

// const AdmitStudentForm = () => {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   // `?mode=existing` in the URL pre-selects the "Existing student"
//   // branch. Lets us deep-link from a future "Enroll existing" button
//   // on the students list page without needing a separate route.
//   const initialMode: "new" | "existing" =
//     searchParams.get("mode") === "existing" ? "existing" : "new";
//   const [mode, setMode] = useState<"new" | "existing">(initialMode);

//   const [admitStudent, { isLoading: isAdmitting }] = useAdmitStudentMutation();
//   const [enrollExisting, { isLoading: isEnrolling }] =
//     useEnrollExistingStudentMutation();
//   const { data: coursesData } = useGetAllCoursesQuery({
//     isActive: true,
//     // Hide completed (graduated) batches from the admit picker — the
//     // backend gates re-enrollment but the picker is the better place
//     // to keep the option off-screen entirely. A completed course
//     // means the batch has graduated and no new enrollments are
//     // accepted. (Backend re-opens via the Courses page.)
//     isCompleted: false,
//     limit: 100,
//   });
//   const courses = useMemo(() => coursesData?.data || [], [coursesData]);
//   // Post-submit success state. We keep the FULL student (not just
//   // credentials) so the "Make Payment" action can open RecordPaymentModal
//   // directly — that modal requires the complete TStudent shape. The
//   // credentials are kept alongside so admins can still copy the login
//   // ID and initial password for the student from inside the modal.
//   const [successState, setSuccessState] = useState<{
//     student: TStudent;
//     credentials: TStudentCredentials;
//   } | null>(null);
//   const [paymentModalOpen, setPaymentModalOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // ── Existing-student lookup state ─────────────────────────────────
//   // `mobileLookup` is the debounced value fed to the students query;
//   // `mobileRaw` is the raw input so we don't lose what the admin typed
//   // mid-debounce. `matchedStudent` is the selected row (used as the
//   // payload source for the enroll-existing submit).
//   const [mobileRaw, setMobileRaw] = useState("");
//   const [mobileLookup, setMobileLookup] = useState("");
//   const [matchedStudent, setMatchedStudent] = useState<TStudent | null>(null);
//   // 400ms debounce on the mobile lookup so we don't hammer the backend
//   // on every keystroke.
//   useEffect(() => {
//     const handle = setTimeout(() => setMobileLookup(mobileRaw.trim()), 400);
//     return () => clearTimeout(handle);
//   }, [mobileRaw]);
//   const isValidMobile = phoneRegex.test(mobileLookup);
//   const { data: lookupData, isFetching: isLookingUp } = useGetAllStudentsQuery(
//     { searchTerm: mobileLookup, limit: 5 },
//     { skip: !isValidMobile || mode !== "existing" },
//   );
//   const lookupResults = useMemo(() => lookupData?.data ?? [], [lookupData]);

//   // When the admin switches modes, reset transient state so the
//   // existing-branch UI doesn't leak into the new-branch form (and
//   // vice versa). The shared form values (mobile / course / batch)
//   // are preserved on purpose — re-entering them after every mode
//   // toggle would be annoying.
//   useEffect(() => {
//     setMatchedStudent(null);
//     setMobileRaw("");
//     setMobileLookup("");
//   }, [mode]);

//   // When a student is matched in existing mode, scroll the Course &
//   // Batch card into view so the admin immediately sees where to go
//   // next (instead of being stranded on the find-student card).
//   const courseBatchCardRef = useRef<HTMLDivElement | null>(null);
//   useEffect(() => {
//     if (matchedStudent && mode === "existing") {
//       // Defer to next tick so the matched-student card has finished
//       // rendering and the layout reflects the new height.
//       const t = setTimeout(() => {
//         courseBatchCardRef.current?.scrollIntoView({
//           behavior: "smooth",
//           block: "start",
//         });
//       }, 50);
//       return () => clearTimeout(t);
//     }
//   }, [matchedStudent, mode]);

//   // Resolve the schema fresh per render so the strictness tracks the
//   // current mode (new = required fields enforced; existing = those
//   // fields are unmounted, so the schema goes permissive to avoid
//   // phantom errors). The resolver is rebuilt via useMemo on every
//   // mode change so RHF re-validates the whole form the moment the
//   // admin flips the toggle.
//   const resolver = useMemo(() => zodResolver(buildSchema(mode)), [mode]);

//   const {
//     register,
//     handleSubmit,
//     control,
//     watch,
//     setValue,
//     reset,
//     trigger,
//     clearErrors,
//     formState: { errors },
//   } = useForm<FormData, any, FormData>({
//     mode: "onSubmit",
//     reValidateMode: "onChange",
//     resolver,

//     defaultValues: {
//       name: "",
//       nickname: "",
//       college: "",
//       mobile: "",
//       bloodGroup: undefined,

//       fatherName: "",
//       fatherOccupation: "",
//       fatherMobile: "",

//       motherName: "",
//       motherOccupation: "",
//       motherMobile: "",

//       addressVillage: "",
//       addressPostOffice: "",
//       addressUpozila: "",
//       addressDistrict: "",

//       sscInstitute: "",
//       sscBoard: undefined,
//       sscPassingYear: undefined,
//       sscGpa: undefined,

//       courseId: "",
//       batchDayId: "",
//       batchTime: "4:00 PM",
//     },
//   });

//   const clearFieldError = <T extends keyof FormData>(field: T) => {
//     if (errors[field]) {
//       clearErrors(field);
//     }
//   };

//   // Re-validate the whole form when the mode toggle flips — but ONLY
//   // on actual mode changes, NOT on initial mount. The trigger on
//   // mount would populate `errors` with required-field failures the
//   // instant the page opens, breaking the "no errors before first
//   // Submit" contract that `mode: "onSubmit"` is supposed to enforce
//   // (RHF's `mode` gate doesn't apply to programmatic `trigger()`
//   // calls). We use a ref to skip the very first run.
//   const isFirstModeEffect = useRef(true);
//   useEffect(() => {
//     if (isFirstModeEffect.current) {
//       isFirstModeEffect.current = false;
//       return;
//     }
//     trigger();
//     // We intentionally re-run on every mode flip; `trigger` is
//     // stable across renders per RHF.
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mode]);

//   const selectedCourseId = watch("courseId");
//   const selectedBatchDayId = watch("batchDayId");
//   const selectedCourse = useMemo(
//     () => courses.find((c) => c.id === selectedCourseId) || null,
//     [courses, selectedCourseId],
//   );
//   const selectedBatchDay = useMemo(
//     () =>
//       selectedCourse?.batchDays?.find((d) => d.id === selectedBatchDayId) ||
//       null,
//     [selectedCourse, selectedBatchDayId],
//   );

//   const handleCourseChange = (value: string) => {
//     setValue("courseId", value, { shouldValidate: true });
//     const course = courses.find((c) => c.id === value);
//     if (course && course.batchDays && course.batchDays.length > 0) {
//       const firstDay = course.batchDays[0];
//       setValue("batchDayId", firstDay.id, { shouldValidate: true });
//       setValue("batchTime", firstDay.times[0]);
//     } else {
//       setValue("batchDayId", "");
//     }
//   };

//   const handleBatchDayChange = (dayId: string) => {
//     setValue("batchDayId", dayId, { shouldValidate: true });
//     const day = selectedCourse?.batchDays?.find((d) => d.id === dayId);
//     if (day) {
//       setValue("batchTime", day.times[0]);
//     }
//   };

//   const onSubmit = async (data: FormData) => {
//     setIsSubmitting(true);
//     // eslint-disable-next-line no-console
//     console.log("[AdmitStudentForm] submit fired", {
//       mode,
//       matchedStudent: matchedStudent?.user?.studentId ?? null,
//       courseId: data.courseId,
//       batchDayId: data.batchDayId,
//       batchTime: data.batchTime,
//     });
//     try {
//       // ── Existing-student branch ────────────────────────────────────
//       // Sends only { mobile, courseId, batchDayId, batchTime, nickname? }
//       // — the backend matches the existing profile and reuses it.
//       if (mode === "existing") {
//         // matchedStudent is held in component state (not in the form)
//         // — the loose schema can't catch "no student picked" on its own,
//         // so we surface it as a focused inline message next to the
//         // mobile field below, not a toast.
//         if (!matchedStudent) {
//           toast.error("Find and select a student first (type a mobile above)");
//           setIsSubmitting(false);
//           return;
//         }
//         // The loose schema enforces courseId / batchDayId / batchTime
//         // (uuid + regex) so RHF blocks `onSubmit` before reaching here
//         // when those are missing. No fallback toast needed.
//         // eslint-disable-next-line no-console
//         console.log("[AdmitStudentForm] dispatching enrollExisting", {
//           mobile: matchedStudent.mobile,
//           courseId: data.courseId,
//           batchDayId: data.batchDayId,
//           batchTime: data.batchTime,
//         });
//         const res = await enrollExisting({
//           mobile: matchedStudent.mobile,
//           courseId: data.courseId,
//           batchDayId: data.batchDayId,
//           batchTime: data.batchTime,
//         }).unwrap();
//         if (res.success && res.data?.student && res.data?.credentials) {
//           setSuccessState({
//             student: res.data.student,
//             credentials: res.data.credentials,
//           });
//           toast.success("Existing student added to the new course");
//         }
//         return;
//       }

//       // ── New-student branch ────────────────────────────────────────
//       // The RHF resolver already enforces the new-mode rules
//       // (required fields + format checks), and `mode: "onTouched"`
//       // makes those errors surface inline at the bottom of each
//       // affected field. `onSubmit` only fires when the resolver
//       // passes, so we don't need a second validation pass here —
//       // just coerce blanks to null for the backend payload and
//       // submit.

//       // Helper: treat "" / undefined / null as `null` for optional fields
//       // so the backend's `nullIfEmpty` helper receives a real null and the
//       // DB stores NULL instead of "" (cleaner for analytics / exports).
//       const blankToNull = (v: unknown): string | null =>
//         v === undefined || v === null || v === "" ? null : (v as string);
//       const numBlankToNull = (v: unknown): number | null => {
//         if (v === undefined || v === null) return null;
//         // Accept both already-coerced numbers and the raw string from
//         // the form (we removed `valueAsNumber: true` so empty / typed
//         // values arrive here as strings, not NaN).
//         if (typeof v === "number" && Number.isFinite(v)) return v;
//         if (typeof v === "string") {
//           const trimmed = v.trim();
//           if (trimmed === "") return null;
//           const parsed = Number(trimmed);
//           return Number.isFinite(parsed) ? parsed : null;
//         }
//         return null;
//       };
//       const payload = {
//         name: data.name,
//         nickname: data.nickname || undefined,
//         college: data.college || undefined,
//         mobile: data.mobile,
//         bloodGroup: data.bloodGroup || null,
//         fatherName: data.fatherName,
//         fatherOccupation: data.fatherOccupation,
//         fatherMobile: data.fatherMobile,
//         motherName: blankToNull(data.motherName),
//         motherOccupation: blankToNull(data.motherOccupation),
//         motherMobile: blankToNull(data.motherMobile),
//         addressVillage: blankToNull(data.addressVillage),
//         addressPostOffice: blankToNull(data.addressPostOffice),
//         addressUpozila: data.addressUpozila,
//         addressDistrict: data.addressDistrict,
//         sscInstitute: data.sscInstitute,
//         sscBoard: data.sscBoard || null,
//         sscPassingYear: numBlankToNull(data.sscPassingYear),
//         sscGpa: numBlankToNull(data.sscGpa),
//         courseId: data.courseId,
//         batchDayId: data.batchDayId,
//         batchTime: data.batchTime,
//       };
//       const res = await admitStudent(payload as TAdmitStudentPayload).unwrap();
//       if (res.success && res.data?.student && res.data?.credentials) {
//         setSuccessState({
//           student: res.data.student,
//           credentials: res.data.credentials,
//         });
//         // Two toast paths: brand-new admit (login credentials created)
//         // vs. existing-profile re-enrolment (no new login info). The
//         // success modal handles the user-facing copy.
//         toast.success(
//           res.data.credentials.alreadyEnrolled
//             ? "Existing student added to the new course"
//             : "Student admitted successfully",
//         );
//       }
//     } catch (err: any) {
//       // RTK Query's error shape varies:
//       //   - HTTP 4xx/5xx with JSON body: { status, data: { success, message, ... } }
//       //   - Network / CORS / parse failure: { status: 'FETCH_ERROR'|'PARSING_ERROR', error: '...' }
//       // Try every plausible message location so the toast always shows
//       // something useful instead of a silent failure.
//       const message =
//         err?.data?.message ||
//         err?.data?.error ||
//         err?.error ||
//         err?.message ||
//         (typeof err?.data === "string" ? err.data : null) ||
//         "Failed to admit student. See the console for details.";
//       // Always log so we can diagnose silent toasts in the browser console.
//       // eslint-disable-next-line no-console
//       // console.error("[AdmitStudentForm] submit error:", err);
//       toast.error(message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // ── Success modal ──────────────────────────────────────────────
//   // Render the form as usual underneath, and overlay the success
//   // modal when `successState` is set. Closing the modal does NOT
//   // unmount the form — the user can pick "Admit Another" to wipe the
//   // form and stay on the page, or "Back to List" to navigate away.
//   const successModal = successState ? (
//     <AdmitSuccessModal
//       student={successState.student}
//       credentials={successState.credentials}
//       onMakePayment={() => setPaymentModalOpen(true)}
//       onBackToList={() => router.push("/dashboard/students")}
//       onAdmitAnother={() => {
//         // Reset the form to its default new-student state and close
//         // the modal. Faster than `router.push("/dashboard/students/new")`
//         // because it avoids a route round-trip + RHF remount.
//         setSuccessState(null);
//         setMatchedStudent(null);
//         setMobileRaw("");
//         setMobileLookup("");
//         reset({
//           name: "",
//           nickname: "",
//           college: "",
//           mobile: "",
//           bloodGroup: null,
//           fatherName: "",
//           fatherOccupation: "",
//           fatherMobile: "",
//           motherName: null,
//           motherOccupation: null,
//           motherMobile: null,
//           addressVillage: null,
//           addressPostOffice: null,
//           addressUpozila: "",
//           addressDistrict: "",
//           sscInstitute: "",
//           sscBoard: null,
//           sscPassingYear: "",
//           sscGpa: "",
//           courseId: "",
//           batchDayId: "",
//           batchTime: "",
//         });
//       }}
//     />
//   ) : null;

//   // The payment modal is mounted only when the success state is set,
//   // so a "Make Payment" click that fails / cancels can't reopen
//   // without a fresh admit success.
//   const paymentModal = successState ? (
//     <RecordPaymentModal
//       open={paymentModalOpen}
//       onClose={() => setPaymentModalOpen(false)}
//       student={successState.student}
//       preselect={
//         successState.credentials.studentCourseId
//           ? {
//               // Best-effort preselect: the RecordPaymentModal computes its
//               // own summaries from `student.studentCourses`, so we only need
//               // to point at the new enrollment. Fall back to the first
//               // unpaid enrollment when the per-enrollment ID isn't echoed
//               // back (e.g. fresh admit returning credentials but no
//               // studentCourseId yet).
//               studentCourseId: successState.credentials.studentCourseId,
//               courseName:
//                 successState.student.studentCourses?.find(
//                   (sc) => sc.id === successState.credentials.studentCourseId,
//                 )?.course?.name ?? "",
//               fee: Number(
//                 successState.student.studentCourses?.find(
//                   (sc) => sc.id === successState.credentials.studentCourseId,
//                 )?.course?.fee ?? 0,
//               ),
//               paid: 0,
//               due: Number(
//                 successState.student.studentCourses?.find(
//                   (sc) => sc.id === successState.credentials.studentCourseId,
//                 )?.course?.fee ?? 0,
//               ),
//             }
//           : undefined
//       }
//       onSuccess={() => {
//         // Refresh the success modal so the due badge reflects the new
//         // payment. Re-fetching the student keeps it consistent with
//         // what was recorded.
//         // Note: we don't auto-close the success modal after payment —
//         // the admin may want to copy the credentials first.
//       }}
//     />
//   ) : null;

//   return (
//     <>
//       <form
//         onSubmit={handleSubmit(onSubmit, () => {
//           // RHF blocks `onSubmit` when the resolver finds issues. Every
//           // field already renders its own error block below the input,
//           // so we don't surface a separate toast here — a toast is
//           // transient (auto-dismisses) and names only the first failure,
//           // whereas the inline error sticks until the admin fixes the
//           // field and shows the precise message for that field.
//         })}
//         className="space-y-6"
//       >
//         {/* ── Mode toggle ─────────────────────────────────────────────
//           Two-way switch between admitting a brand-new student and
//           enrolling an existing one in another course. In existing mode
//           the personal/guardian/address/SSC cards are hidden — only the
//           mobile lookup + course/batch are needed. */}
//         <Card>
//           <CardContent className="pt-6">
//             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//               <div>
//                 <p className="text-sm font-medium">Are you admitting…</p>
//                 <p className="text-xs text-muted-foreground">
//                   Pick "Existing student" if their profile is already on file —
//                   only the course + batch are needed.
//                 </p>
//               </div>
//               <div className="inline-flex rounded-md border bg-muted/30 p-1">
//                 <button
//                   type="button"
//                   onClick={() => setMode("new")}
//                   className={
//                     "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors " +
//                     (mode === "new"
//                       ? "bg-background shadow text-foreground"
//                       : "text-muted-foreground hover:text-foreground")
//                   }
//                   aria-pressed={mode === "new"}
//                 >
//                   New student
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setMode("existing")}
//                   className={
//                     "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors " +
//                     (mode === "existing"
//                       ? "bg-background shadow text-foreground"
//                       : "text-muted-foreground hover:text-foreground")
//                   }
//                   aria-pressed={mode === "existing"}
//                 >
//                   Existing student
//                 </button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {mode === "existing" && (
//           <Card>
//             <CardHeader>
//               <CardTitle>Find Existing Student</CardTitle>
//               <p className="text-sm text-muted-foreground">
//                 Type the student's mobile number. We'll look them up and confirm
//                 before creating a new enrollment.
//               </p>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="existing-mobile">Mobile</Label>
//                 <div className="flex gap-2">
//                   <div className="relative flex-1">
//                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//                     <Input
//                       id="existing-mobile"
//                       className="pl-8"
//                       placeholder="01XXXXXXXXX"
//                       value={mobileRaw}
//                       onChange={(e) => setMobileRaw(e.target.value)}
//                       disabled={!!matchedStudent}
//                     />
//                   </div>
//                   {matchedStudent && (
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() => setMatchedStudent(null)}
//                     >
//                       Change
//                     </Button>
//                   )}
//                 </div>
//                 {mobileRaw && !isValidMobile && (
//                   <p className="text-xs text-muted-foreground">
//                     Keep typing — needs 11 digits (01XXXXXXXXX).
//                   </p>
//                 )}
//               </div>

//               {/* Lookup results: debounced 400ms via useEffect above. */}
//               {!matchedStudent && isValidMobile && (
//                 <div className="rounded-md border bg-muted/20">
//                   {isLookingUp && (
//                     <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
//                       <Loader2 className="h-3 w-3 animate-spin" />
//                       Searching…
//                     </div>
//                   )}
//                   {!isLookingUp && lookupResults.length === 0 && (
//                     <div className="space-y-2 px-3 py-3">
//                       <p className="text-sm text-amber-700 dark:text-amber-400">
//                         No student found with this mobile. Double-check the
//                         number or switch to "New student" if they haven't been
//                         admitted before.
//                       </p>
//                       <Button
//                         type="button"
//                         size="sm"
//                         variant="outline"
//                         onClick={() => setMode("new")}
//                       >
//                         Switch to New student
//                       </Button>
//                     </div>
//                   )}
//                   {!isLookingUp && lookupResults.length > 0 && (
//                     <ul className="divide-y">
//                       {lookupResults.map((s) => {
//                         const enrolled = s.studentCourses ?? [];
//                         return (
//                           <li key={s.id}>
//                             <button
//                               type="button"
//                               className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors hover:bg-muted/40"
//                               onClick={() => {
//                                 setMatchedStudent(s);
//                                 // Lock the mobile field to the matched
//                                 // student's canonical mobile — admins
//                                 // may have typed a sibling's number.
//                                 if (s.mobile) setMobileRaw(s.mobile);
//                               }}
//                             >
//                               <div className="flex w-full items-center justify-between">
//                                 <span className="font-medium">
//                                   {s.user.name}
//                                   {s.user.nickname
//                                     ? ` (${s.user.nickname})`
//                                     : ""}
//                                 </span>
//                                 <span className="font-mono text-xs text-muted-foreground">
//                                   {s.user.studentId}
//                                 </span>
//                               </div>
//                               <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
//                                 <span>{s.mobile}</span>
//                                 {enrolled.length > 0 && (
//                                   <span>
//                                     • Already in:{" "}
//                                     {enrolled
//                                       .map((sc) => sc.course?.name ?? "course")
//                                       .join(", ")}
//                                   </span>
//                                 )}
//                               </div>
//                             </button>
//                           </li>
//                         );
//                       })}
//                     </ul>
//                   )}
//                 </div>
//               )}

//               {matchedStudent && (
//                 <div className="rounded-md border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
//                   <div className="space-y-1">
//                     <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
//                       Selected: {matchedStudent.user.name}
//                       {matchedStudent.user.nickname
//                         ? ` (${matchedStudent.user.nickname})`
//                         : ""}
//                     </p>
//                     <p className="text-xs text-blue-700 dark:text-blue-300">
//                       Mobile: {matchedStudent.mobile} · Student ID:{" "}
//                       <span className="font-mono">
//                         {matchedStudent.user.studentId}
//                       </span>
//                     </p>
//                     {matchedStudent.studentCourses &&
//                       matchedStudent.studentCourses.length > 0 && (
//                         <p className="text-xs text-blue-700 dark:text-blue-300">
//                           Currently enrolled in:{" "}
//                           {matchedStudent.studentCourses
//                             .map((sc) =>
//                               formatCourseLabel(sc.course?.name ?? ""),
//                             )
//                             .join(", ")}
//                         </p>
//                       )}
//                   </div>
//                   <p className="text-xs text-blue-700 dark:text-blue-300">
//                     Now pick a course + batch below and click{" "}
//                     <strong>Enroll in Course</strong> to finish.
//                   </p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         )}

//         {mode === "new" && (
//           <>
//             <Card>
//               <CardHeader>
//                 <CardTitle>Personal Information</CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-4 md:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="name">Full Name *</Label>
//                   <Input id="name" {...register("name")} />
//                   {errors.name && (
//                     <p className="text-sm text-destructive">
//                       {errors.name.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="nickname">Nickname</Label>
//                   <Input id="nickname" {...register("nickname")} />
//                   {errors.nickname && (
//                     <p className="text-sm text-destructive">
//                       {errors.nickname.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="mobile">Mobile *</Label>
//                   <Input
//                     id="mobile"
//                     {...register("mobile")}
//                     placeholder="01XXXXXXXXX"
//                   />
//                   {errors.mobile && (
//                     <p className="text-sm text-destructive">
//                       {errors.mobile.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Blood Group</Label>
//                   <Controller
//                     control={control}
//                     name="bloodGroup"
//                     render={({ field }) => (
//                       <Select
//                         onValueChange={field.onChange}
//                         value={field.value ?? ""}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {bloodGroups.map((bg) => (
//                             <SelectItem key={bg.value} value={bg.value}>
//                               {bg.label}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     )}
//                   />
//                   {errors.bloodGroup && (
//                     <p className="text-sm text-destructive">
//                       {errors.bloodGroup.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2 md:col-span-2">
//                   <Label htmlFor="college">College</Label>
//                   <Input id="college" {...register("college")} />
//                   {errors.college && (
//                     <p className="text-sm text-destructive">
//                       {errors.college.message}
//                     </p>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Guardian Information</CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-4 md:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="fatherName">Father Name *</Label>
//                   <Input id="fatherName" {...register("fatherName")} />
//                   {errors.fatherName && (
//                     <p className="text-sm text-destructive">
//                       {errors.fatherName.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="fatherOccupation">Father Occupation *</Label>
//                   <Input
//                     id="fatherOccupation"
//                     {...register("fatherOccupation")}
//                   />
//                   {errors.fatherOccupation && (
//                     <p className="text-sm text-destructive">
//                       {errors.fatherOccupation.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="fatherMobile">Father Mobile *</Label>
//                   <Input
//                     id="fatherMobile"
//                     {...register("fatherMobile")}
//                     placeholder="01XXXXXXXXX"
//                   />
//                   {errors.fatherMobile && (
//                     <p className="text-sm text-destructive">
//                       {errors.fatherMobile.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="motherName">Mother Name</Label>
//                   <Input id="motherName" {...register("motherName")} />
//                   {errors.motherName && (
//                     <p className="text-sm text-destructive">
//                       {errors.motherName.message as string}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="motherOccupation">Mother Occupation</Label>
//                   <Input
//                     id="motherOccupation"
//                     {...register("motherOccupation")}
//                   />
//                   {errors.motherOccupation && (
//                     <p className="text-sm text-destructive">
//                       {errors.motherOccupation.message as string}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="motherMobile">Mother Mobile</Label>
//                   <Input
//                     id="motherMobile"
//                     {...register("motherMobile")}
//                     placeholder="01XXXXXXXXX"
//                   />
//                   {errors.motherMobile && (
//                     <p className="text-sm text-destructive">
//                       {errors.motherMobile.message as string}
//                     </p>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Address</CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-4 md:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="addressVillage">Village</Label>
//                   <Input id="addressVillage" {...register("addressVillage")} />
//                   {errors.addressVillage && (
//                     <p className="text-sm text-destructive">
//                       {errors.addressVillage.message as string}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="addressPostOffice">Post Office</Label>
//                   <Input
//                     id="addressPostOffice"
//                     {...register("addressPostOffice")}
//                   />
//                   {errors.addressPostOffice && (
//                     <p className="text-sm text-destructive">
//                       {errors.addressPostOffice.message as string}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="addressUpozila">Upazila *</Label>
//                   <Input id="addressUpozila" {...register("addressUpozila")} />
//                   {errors.addressUpozila && (
//                     <p className="text-sm text-destructive">
//                       {errors.addressUpozila.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="addressDistrict">District *</Label>
//                   <Input
//                     id="addressDistrict"
//                     {...register("addressDistrict")}
//                   />
//                   {errors.addressDistrict && (
//                     <p className="text-sm text-destructive">
//                       {errors.addressDistrict.message}
//                     </p>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>SSC Information</CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-4 md:grid-cols-2">
//                 <div className="space-y-2 md:col-span-2">
//                   <Label htmlFor="sscInstitute">Institute *</Label>
//                   <Input id="sscInstitute" {...register("sscInstitute")} />
//                   {errors.sscInstitute && (
//                     <p className="text-sm text-destructive">
//                       {errors.sscInstitute.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Board</Label>
//                   <Controller
//                     control={control}
//                     name="sscBoard"
//                     render={({ field }) => (
//                       <Select
//                         onValueChange={field.onChange}
//                         value={field.value ?? ""}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {educationBoards.map((b) => (
//                             <SelectItem key={b.value} value={b.value}>
//                               {b.label}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     )}
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="sscPassingYear">Passing Year</Label>
//                   <Input
//                     id="sscPassingYear"
//                     type="number"
//                     // No `valueAsNumber: true` here: in existing mode the
//                     // input is unmounted, and an empty string coerced with
//                     // valueAsNumber becomes `NaN`, which fails the loose
//                     // schema. Coerce to number at submit time via
//                     // `numBlankToNull` instead so both modes share one path.
//                     {...register("sscPassingYear")}
//                   />
//                   {errors.sscPassingYear && (
//                     <p className="text-sm text-destructive">
//                       {errors.sscPassingYear.message as string}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="sscGpa">GPA</Label>
//                   <Input
//                     id="sscGpa"
//                     type="number"
//                     step="0.01"
//                     // See note above for `sscPassingYear`.
//                     {...register("sscGpa")}
//                   />
//                   {errors.sscGpa && (
//                     <p className="text-sm text-destructive">
//                       {errors.sscGpa.message as string}
//                     </p>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>
//           </>
//         )}

//         <Card ref={courseBatchCardRef}>
//           <CardHeader>
//             <CardTitle>Course & Batch</CardTitle>
//             <p className="text-sm text-muted-foreground">
//               Pick the course, then a batch group. The day and time are filtered
//               to that group's slots.
//             </p>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="space-y-2">
//               <Label>Course *</Label>
//               <Controller
//                 control={control}
//                 name="courseId"
//                 render={({ field }) => (
//                   <Select
//                     onValueChange={handleCourseChange}
//                     value={field.value}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select a course" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {courses.length === 0 && (
//                         <SelectItem value="none" disabled>
//                           No active, open courses available. Create one or
//                           re-open a completed course from the Courses page.
//                         </SelectItem>
//                       )}
//                       {courses.map((c) => (
//                         <SelectItem key={c.id} value={c.id}>
//                           {formatCourseLabel(c.name)} — ৳{Number(c.fee)}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 )}
//               />
//               {errors.courseId && (
//                 <p className="text-sm text-destructive">
//                   {errors.courseId.message}
//                 </p>
//               )}
//             </div>

//             {selectedCourse && (
//               <>
//                 {selectedCourse.batchDays &&
//                   selectedCourse.batchDays.length > 0 && (
//                     <div className="space-y-2">
//                       <Label>Batch Day *</Label>
//                       <Controller
//                         control={control}
//                         name="batchDayId"
//                         render={({ field }) => (
//                           <Select
//                             onValueChange={handleBatchDayChange}
//                             value={field.value}
//                           >
//                             <SelectTrigger>
//                               <SelectValue placeholder="Select a batch day" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {selectedCourse.batchDays!.map((d) => (
//                                 <SelectItem key={d.id} value={d.id}>
//                                   {d.name} — {d.days.join(", ")} @{" "}
//                                   {d.times.join(", ")}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         )}
//                       />
//                       {errors.batchDayId && (
//                         <p className="text-sm text-destructive">
//                           {errors.batchDayId.message as string}
//                         </p>
//                       )}
//                     </div>
//                   )}

//                 {selectedBatchDay && (
//                   <div className="grid gap-4 md:grid-cols-2">
//                     <div className="space-y-2">
//                       <Label>Days</Label>
//                       <div className="flex flex-wrap gap-1 pt-1">
//                         {selectedBatchDay.days.map((d) => (
//                           <Badge key={d} variant="outline">
//                             {d}
//                           </Badge>
//                         ))}
//                       </div>
//                     </div>
//                     <div className="space-y-2">
//                       <Label>Batch Time *</Label>
//                       <Controller
//                         control={control}
//                         name="batchTime"
//                         render={({ field }) => (
//                           <Select
//                             onValueChange={field.onChange}
//                             value={field.value}
//                           >
//                             <SelectTrigger>
//                               <SelectValue />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {selectedBatchDay.times.map((t) => (
//                                 <SelectItem key={t} value={t}>
//                                   {t}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         )}
//                       />
//                       {errors.batchTime && (
//                         <p className="text-sm text-destructive">
//                           {errors.batchTime.message}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 )}

//                 <div className="rounded-md border bg-muted/40 p-3 text-xs">
//                   <div className="font-medium mb-1">
//                     All available batch days:
//                   </div>
//                   <div className="space-y-1">
//                     {selectedCourse.batchDays?.map((d) => (
//                       <div
//                         key={d.id}
//                         className="flex items-center gap-2 flex-wrap"
//                       >
//                         <Badge variant="outline">{d.name}</Badge>
//                         <span className="text-muted-foreground">
//                           {d.days.join(", ")}
//                         </span>
//                         <span>@</span>
//                         <span>{d.times.join(", ")}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </>
//             )}
//           </CardContent>
//         </Card>

//         <div className="flex justify-end gap-2">
//           <Button type="button" variant="outline" onClick={() => router.back()}>
//             Cancel
//           </Button>
//           <Button
//             type="submit"
//             disabled={
//               isSubmitting ||
//               isAdmitting ||
//               isEnrolling ||
//               // New-mode strict disable (RHF will surface field errors).
//               (mode === "new" && (!selectedCourseId || !selectedBatchDayId))
//               // Existing-mode keeps the button clickable so admins get
//               // a clear toast if anything's missing, rather than a
//               // silently-disabled button.
//             }
//           >
//             {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
//             {mode === "existing" ? "Enroll in Course" : "Admit Student"}
//           </Button>
//         </div>
//       </form>
//       {successModal}
//       {paymentModal}
//     </>
//   );
// };

// // ── Success modal ───────────────────────────────────────────────
// // Lives in the same file because it's tightly coupled to the admit
// // form's submit state and not reused elsewhere. Renders three CTAs:
// //   1. Make Payment — opens the existing RecordPaymentModal preloaded
// //      with the freshly-admitted student + new enrollment.
// //   2. Back to List — navigates to the student list.
// //   3. Admit Another — clears the form and dismisses the modal.
// const AdmitSuccessModal = ({
//   student,
//   credentials,
//   onMakePayment,
//   onBackToList,
//   onAdmitAnother,
// }: {
//   student: TStudent;
//   credentials: TStudentCredentials;
//   onMakePayment: () => void;
//   onBackToList: () => void;
//   onAdmitAnother: () => void;
// }) => {
//   // Two flavors of success: a brand-new admit (login credentials
//   // minted) vs. an existing-profile re-enrolment (no new password).
//   const isExisting = Boolean(credentials.alreadyEnrolled);
//   const primaryId = isExisting
//     ? (credentials.studentCourseId ?? credentials.studentId)
//     : credentials.studentId;

//   // Pre-compute the due badge for the "Make Payment" button so the
//   // admin knows if collection is even needed without opening the
//   // payment modal. Sum across all current enrollments — admins can
//   // choose which to settle from inside the modal.
//   const totalDue = (student.studentCourses ?? []).reduce(
//     (sum, sc) =>
//       sum +
//       Math.max(
//         0,
//         Number(sc.course?.fee ?? 0) -
//           (student.payments ?? [])
//             .filter((p) => p.studentCourseId === sc.id)
//             .reduce((s, p) => s + Number(p.amount), 0),
//       ),
//     0,
//   );
//   const totalPaid = (student.payments ?? []).reduce(
//     (s, p) => s + Number(p.amount),
//     0,
//   );

//   return (
//     <Dialog
//       open={true}
//       onOpenChange={(open) => {
//         if (!open) onAdmitAnother();
//       }}
//     >
//       <DialogContent
//         className="sm:max-w-md"
//         // Hide the default X close so admins don't accidentally
//         // discard the success state — closing the modal calls
//         // `onAdmitAnother` which clears the form. Use the explicit
//         // "Admit Another" button instead.
//         hideCloseButton
//       >
//         <DialogHeader>
//           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
//             <CheckCircle2 className="h-6 w-6 text-emerald-600" />
//           </div>
//           <DialogTitle className="text-center">
//             {isExisting ? "Added to new course" : "Student admitted"}
//           </DialogTitle>
//           <DialogDescription className="text-center">
//             {isExisting
//               ? `${student.user.name} is now enrolled in the new course. Their existing login (mobile number) is unchanged.`
//               : `${student.user.name} has been added. What would you like to do next?`}
//           </DialogDescription>
//         </DialogHeader>

//         <div className="space-y-3">
//           {/* Inline credentials so admins can still copy/print the
//               login info for the student — we just no longer lead with
//               it. The card is collapsible-feeling (small, muted) so it
//               doesn't overshadow the action buttons. */}
//           <div className="rounded-md border bg-muted/40 p-3">
//             <p className="text-xs font-medium text-muted-foreground mb-1.5">
//               {isExisting ? "Per-Enrollment ID" : "Login credentials"}
//             </p>
//             <div className="grid grid-cols-2 gap-2 text-sm">
//               <div className="font-mono">
//                 <span className="text-xs text-muted-foreground block">
//                   {isExisting ? "Roll #" : "Student ID"}
//                 </span>
//                 <span className="font-semibold">{primaryId}</span>
//               </div>
//               {!isExisting && (
//                 <div className="font-mono">
//                   <span className="text-xs text-muted-foreground block">
//                     Initial Password
//                   </span>
//                   <span className="font-semibold">
//                     {credentials.initialPassword}
//                   </span>
//                 </div>
//               )}
//             </div>
//             <Button
//               variant="ghost"
//               size="sm"
//               className="mt-2 -ml-2 h-7 text-xs"
//               onClick={() => {
//                 const value = isExisting
//                   ? primaryId
//                   : `${credentials.studentId} / ${credentials.initialPassword}`;
//                 navigator.clipboard.writeText(value);
//                 toast.success("Copied!");
//               }}
//             >
//               <Copy className="h-3 w-3 mr-1" />
//               {isExisting ? "Copy roll #" : "Copy credentials"}
//             </Button>
//           </div>

//           {/* Payment status summary — surfaces whether the new
//               enrollment still has a balance so the admin knows if
//               "Make Payment" is worth clicking now. */}
//           {!isExisting && (
//             <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
//               <span className="text-muted-foreground">Total due</span>
//               <Badge variant={totalDue > 0 ? "warning" : "success"}>
//                 {totalDue > 0
//                   ? `৳${totalDue.toLocaleString()} due`
//                   : totalPaid > 0
//                     ? `৳${totalPaid.toLocaleString()} paid`
//                     : "No charges yet"}
//               </Badge>
//             </div>
//           )}

//           {/* Three CTAs stacked vertically on mobile, primary action
//               on top. Mobile-first because the scanner kiosk lives in a
//               tight physical space. */}
//           <div className="flex flex-col gap-2 pt-1">
//             <Button
//               onClick={onMakePayment}
//               className="w-full"
//               size="lg"
//               disabled={isExisting && totalDue === 0}
//             >
//               <Wallet className="h-4 w-4 mr-2" />
//               Make Payment
//               {totalDue > 0 && (
//                 <span className="ml-2 text-xs opacity-80">
//                   ৳{totalDue.toLocaleString()}
//                 </span>
//               )}
//             </Button>
//             <div className="grid grid-cols-2 gap-2">
//               <Button variant="outline" onClick={onBackToList}>
//                 <ListChecks className="h-4 w-4 mr-1" />
//                 Back to List
//               </Button>
//               <Button variant="outline" onClick={onAdmitAnother}>
//                 <UserPlus className="h-4 w-4 mr-1" />
//                 Admit Another
//               </Button>
//             </div>
//           </div>
//         </div>

//         <DialogFooter className="sm:justify-center">
//           <p className="text-[10px] text-muted-foreground text-center">
//             Admins can re-find this student anytime from the Students page.
//           </p>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default AdmitStudentForm;

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Copy,
  Search,
  CheckCircle2,
  Wallet,
  ListChecks,
  UserPlus,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import {
  useAdmitStudentMutation,
  useEnrollExistingStudentMutation,
  useGetAllStudentsQuery,
} from "@/redux/features/student/student";
import RecordPaymentModal from "@/components/modules/payments/RecordPaymentModal";
import PaymentReceiptView from "@/components/modules/payments/PaymentReceiptView";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { educationBoards } from "@/constants/boards";
import { bloodGroups } from "@/constants/bloodGroups";
import { formatCourseLabel } from "@/constants/labels";
import {
  TStudent,
  TStudentCredentials,
  TAdmitStudentPayload,
} from "@/types/student";
import type { TPaymentRecord } from "@/types/payment";

const phoneRegex = /^01[3-9]\d{8}$/;

const isBlank = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const optionalBounded = (max: number, msg: string) =>
  z
    .string()
    .nullable()
    .optional()
    .refine((v) => isBlank(v) || (v as string).length <= max, { message: msg });

const requiredInNewMode =
  (minLen: number, msg: string) => (mode: "new" | "existing") =>
    z
      .string()
      .nullable()
      .optional()
      .refine(
        (v) =>
          mode !== "new" ||
          (!isBlank(v) && (v as string).trim().length >= minLen),
        { message: msg },
      );

const optionalPhoneFormat = () =>
  z
    .string()
    .nullable()
    .optional()
    .refine((v) => isBlank(v) || phoneRegex.test(v as string), {
      message: "Invalid BD mobile number",
    });

const buildSchema = (mode: "new" | "existing") => {
  return z.object({
    name: requiredInNewMode(2, "Name is required")(mode),
    nickname: optionalBounded(60, "Nickname is too long (max 60 characters)"),
    college: optionalBounded(
      120,
      "College name is too long (max 120 characters)",
    ),
    mobile: requiredInNewMode(
      11,
      "Mobile is required",
    )(mode).refine((v) => isBlank(v) || phoneRegex.test(v as string), {
      message: "Invalid BD mobile number",
    }),
    bloodGroup: z.string().nullable().optional(),
    fatherName: requiredInNewMode(2, "Father name is required")(mode),
    fatherOccupation: requiredInNewMode(2, "Required")(mode),
    fatherMobile: requiredInNewMode(
      11,
      "Father mobile is required",
    )(mode).refine((v) => isBlank(v) || phoneRegex.test(v as string), {
      message: "Invalid BD mobile number",
    }),
    motherName: optionalBounded(
      80,
      "Mother name is too long (max 80 characters)",
    ),
    motherOccupation: optionalBounded(
      80,
      "Mother occupation is too long (max 80 characters)",
    ),
    motherMobile: optionalPhoneFormat(),
    addressVillage: optionalBounded(
      120,
      "Village name is too long (max 120 characters)",
    ),
    addressPostOffice: optionalBounded(
      80,
      "Post office name is too long (max 80 characters)",
    ),
    addressUpozila: requiredInNewMode(1, "Required")(mode),
    addressDistrict: requiredInNewMode(1, "Required")(mode),
    sscInstitute: requiredInNewMode(1, "Required")(mode),
    sscBoard: z.string().nullable().optional(),
    sscPassingYear: z
      .string()
      .optional()
      .refine(
        (v) => {
          if (isBlank(v)) return true;
          const trimmed = (v as string).trim();
          if (!/^\d{4}$/.test(trimmed)) return false;
          const year = Number(trimmed);
          const thisYear = new Date().getFullYear();
          return year >= 2010 && year <= thisYear;
        },
        {
          message: `Year must be between 2010 and ${new Date().getFullYear()} (e.g. ${new Date().getFullYear()})`,
        },
      ),
    sscGpa: z
      .string()
      .optional()
      .refine(
        (v) => {
          if (isBlank(v)) return true;
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 && n <= 5;
        },
        { message: "GPA must be a number between 0 and 5" },
      ),
    courseId: z.string().uuid("Select a course"),
    batchDayId: z.string().uuid("Select a batch day"),
    batchTime: z
      .string()
      .trim()
      .regex(
        /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
        'Time must look like "7:00 AM"',
      ),
  });
};

type FormData = z.infer<ReturnType<typeof buildSchema>>;

const AdmitStudentForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: "new" | "existing" =
    searchParams.get("mode") === "existing" ? "existing" : "new";
  const [mode, setMode] = useState<"new" | "existing">(initialMode);

  const [admitStudent, { isLoading: isAdmitting }] = useAdmitStudentMutation();
  const [enrollExisting, { isLoading: isEnrolling }] =
    useEnrollExistingStudentMutation();
  const { data: coursesData } = useGetAllCoursesQuery({
    isActive: true,
    isCompleted: false,
    limit: 100,
  });
  const courses = useMemo(() => coursesData?.data || [], [coursesData]);
  const [successState, setSuccessState] = useState<{
    student: TStudent;
    credentials: TStudentCredentials;
  } | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The just-recorded payment — opened as a printable receipt
  // overlay after the payment succeeds. Set inside the
  // RecordPaymentModal's `onRecorded` callback. Carries the
  // override status the staff member picked (e.g. "PAID") so the
  // receipt can render the correct badge + PAID seal even when
  // the override doesn't match the actual paid-vs-fee math.
  const [receiptTarget, setReceiptTarget] = useState<{
    payment: TPaymentRecord;
    student: TStudent;
    overrideStatus?: "PAID" | "PARTIAL" | "PENDING" | "_auto";
  } | null>(null);
  // Used for the receipt's "Collected by" line.
  const currentUser = useAppSelector(useCurrentUser);

  const [mobileRaw, setMobileRaw] = useState("");
  const [mobileLookup, setMobileLookup] = useState("");
  const [matchedStudent, setMatchedStudent] = useState<TStudent | null>(null);
  useEffect(() => {
    const handle = setTimeout(() => setMobileLookup(mobileRaw.trim()), 400);
    return () => clearTimeout(handle);
  }, [mobileRaw]);
  const isValidMobile = phoneRegex.test(mobileLookup);
  const { data: lookupData, isFetching: isLookingUp } = useGetAllStudentsQuery(
    { searchTerm: mobileLookup, limit: 5 },
    { skip: !isValidMobile || mode !== "existing" },
  );
  const lookupResults = useMemo(() => lookupData?.data ?? [], [lookupData]);

  useEffect(() => {
    setMatchedStudent(null);
    setMobileRaw("");
    setMobileLookup("");
  }, [mode]);

  const courseBatchCardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (matchedStudent && mode === "existing") {
      const t = setTimeout(() => {
        courseBatchCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [matchedStudent, mode]);

  // ── FIX: memoize the SCHEMA per mode, then the RESOLVER per schema.
  // Previously the resolver was rebuilt on every render, which caused
  // RHF to occasionally hold onto stale validation results for fields
  // whose rules differ between modes — that's why the required-field
  // error stuck around after the user filled the field.
  const schema = useMemo(() => buildSchema(mode), [mode]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    trigger,
    clearErrors,
    formState: { errors },
  } = useForm<FormData, any, FormData>({
    // ── FIX: use "onTouched" so errors only appear after the user
    // has interacted with a field (or after submit), and "onChange"
    // re-validation clears them the moment the value becomes valid.
    // Previously "onSubmit" + "onChange" meant the first submit
    // surfaced every error, but re-validation only ran for the
    // *changed* field — leaving untouched-but-filled fields stuck.
    mode: "onTouched",
    reValidateMode: "onChange",
    resolver,
    defaultValues: {
      name: "",
      nickname: "",
      college: "",
      mobile: "",
      bloodGroup: undefined,
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
      sscBoard: undefined,
      sscPassingYear: undefined,
      sscGpa: undefined,
      courseId: "",
      batchDayId: "",
      batchTime: "4:00 PM",
    },
  });

  // ── FIX: when the mode flips, clear ALL errors first, then (only
  // if the form has already been submitted once) re-run validation
  // with the new schema. Clearing first prevents stale required-
  // field errors from the previous mode leaking into the new mode.
  const hasSubmittedRef = useRef(false);
  useEffect(() => {
    clearErrors();
    if (hasSubmittedRef.current) {
      trigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const selectedCourseId = watch("courseId");
  const selectedBatchDayId = watch("batchDayId");
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );
  const selectedBatchDay = useMemo(
    () =>
      selectedCourse?.batchDays?.find((d) => d.id === selectedBatchDayId) ||
      null,
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
    // Mark that the user has attempted a submit — from now on, mode
    // flips will trigger a re-validation pass.
    hasSubmittedRef.current = true;
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
      if (mode === "existing") {
        if (!matchedStudent) {
          toast.error("Find and select a student first (type a mobile above)");
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
        if (res.success && res.data?.student && res.data?.credentials) {
          setSuccessState({
            student: res.data.student,
            credentials: res.data.credentials,
          });
          toast.success("Existing student added to the new course");
        }
        return;
      }

      const blankToNull = (v: unknown): string | null =>
        v === undefined || v === null || v === "" ? null : (v as string);
      const numBlankToNull = (v: unknown): number | null => {
        if (v === undefined || v === null) return null;
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
      if (res.success && res.data?.student && res.data?.credentials) {
        setSuccessState({
          student: res.data.student,
          credentials: res.data.credentials,
        });
        toast.success(
          res.data.credentials.alreadyEnrolled
            ? "Existing student added to the new course"
            : "Student admitted successfully",
        );
      }
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.data?.error ||
        err?.error ||
        err?.message ||
        (typeof err?.data === "string" ? err.data : null) ||
        "Failed to admit student. See the console for details.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const successModal = successState ? (
    <AdmitSuccessModal
      student={successState.student}
      credentials={successState.credentials}
      onMakePayment={() => setPaymentModalOpen(true)}
      onBackToList={() => router.push("/dashboard/students")}
      onAdmitAnother={() => {
        setSuccessState(null);
        setMatchedStudent(null);
        setMobileRaw("");
        setMobileLookup("");
        hasSubmittedRef.current = false;
        reset({
          name: "",
          nickname: "",
          college: "",
          mobile: "",
          bloodGroup: null,
          fatherName: "",
          fatherOccupation: "",
          fatherMobile: "",
          motherName: null,
          motherOccupation: null,
          motherMobile: null,
          addressVillage: null,
          addressPostOffice: null,
          addressUpozila: "",
          addressDistrict: "",
          sscInstitute: "",
          sscBoard: null,
          sscPassingYear: "",
          sscGpa: "",
          courseId: "",
          batchDayId: "",
          batchTime: "",
        });
      }}
    />
  ) : null;

  const paymentModal = successState ? (
    <RecordPaymentModal
      open={paymentModalOpen}
      onClose={() => setPaymentModalOpen(false)}
      student={successState.student}
      preselect={(() => {
        // Find the just-created enrollment by matching the roll
        // number (`credentials.studentCourseId`, e.g. "271200")
        // against the enrollment's per-course roll, NOT its UUID.
        // The previous version matched on `sc.id` (UUID) which
        // never matched the roll number, so the lookup returned
        // undefined and the modal fell through to its
        // "single-enrollment fallback" — that worked for the
        // first admit only and left the course unselected for any
        // multi-enrollment student.
        const enrollment = successState.student.studentCourses?.find(
          (sc) =>
            sc.studentCourseId === successState.credentials.studentCourseId,
        );
        if (!enrollment) return undefined;
        const fee = Number(enrollment.course?.fee ?? 0);
        const paid = (successState.student.payments ?? [])
          .filter((p) => p.studentCourseId === enrollment.id)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          studentCourseId: enrollment.id,
          courseName: enrollment.course?.name ?? "",
          fee,
          paid,
          due: Math.max(0, fee - paid),
        };
      })()}
      // Fires with the created payment BEFORE the modal closes.
      // We stash it in `receiptTarget` so the printable receipt
      // overlay opens immediately, AND close the success modal in
      // the same step — the user explicitly wants every modal
      // dismissed once the payment lands, leaving only the receipt
      // (and the underlying admit form) on screen.
      // The 2nd argument carries the staff-picked override status;
      // it's needed so the receipt can show "FULLY PAID" + the PAID
      // seal even when the override was applied to a partial
      // payment (amount < fee).
      onRecorded={(payment, overrideStatus) => {
        setReceiptTarget({
          payment,
          student: successState.student,
          overrideStatus,
        });
        setSuccessState(null);
      }}
      // Fires after the record-payment modal has closed. Reset
      // payment-open so a fresh "Make Payment" click could reopen
      // it (defensive — the success modal is now closed by the
      // onRecorded handler above, so this branch is unlikely to
      // run again).
      onSuccess={() => {
        setPaymentModalOpen(false);
      }}
    />
  ) : null;

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit, () => {
          // Errors render inline per-field; no toast needed.
        })}
        className="space-y-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Are you admitting…</p>
                <p className="text-xs text-muted-foreground">
                  Pick "Existing student" if their profile is already on file —
                  only the course + batch are needed.
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
                Type the student's mobile number. We'll look them up and confirm
                before creating a new enrollment.
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
                        No student found with this mobile. Double-check the
                        number or switch to "New student" if they haven't been
                        admitted before.
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
                                if (s.mobile) setMobileRaw(s.mobile);
                              }}
                            >
                              <div className="flex w-full items-center justify-between">
                                <span className="font-medium">
                                  {s.user.name}
                                  {s.user.nickname
                                    ? ` (${s.user.nickname})`
                                    : ""}
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
                      <span className="font-mono">
                        {matchedStudent.user.studentId}
                      </span>
                    </p>
                    {matchedStudent.studentCourses &&
                      matchedStudent.studentCourses.length > 0 && (
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Currently enrolled in:{" "}
                          {matchedStudent.studentCourses
                            .map((sc) =>
                              formatCourseLabel(sc.course?.name ?? ""),
                            )
                            .join(", ")}
                        </p>
                      )}
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Now pick a course + batch below and click{" "}
                    <strong>Enroll in Course</strong> to finish.
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
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input id="nickname" {...register("nickname")} />
                  {errors.nickname && (
                    <p className="text-sm text-destructive">
                      {errors.nickname.message}
                    </p>
                  )}
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
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Controller
                    control={control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
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
                    <p className="text-sm text-destructive">
                      {errors.bloodGroup.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="college">College</Label>
                  <Input id="college" {...register("college")} />
                  {errors.college && (
                    <p className="text-sm text-destructive">
                      {errors.college.message}
                    </p>
                  )}
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
                  <Input
                    id="fatherOccupation"
                    {...register("fatherOccupation")}
                  />
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
                  {errors.motherName && (
                    <p className="text-sm text-destructive">
                      {errors.motherName.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Mother Occupation</Label>
                  <Input
                    id="motherOccupation"
                    {...register("motherOccupation")}
                  />
                  {errors.motherOccupation && (
                    <p className="text-sm text-destructive">
                      {errors.motherOccupation.message as string}
                    </p>
                  )}
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
                  {errors.addressVillage && (
                    <p className="text-sm text-destructive">
                      {errors.addressVillage.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressPostOffice">Post Office</Label>
                  <Input
                    id="addressPostOffice"
                    {...register("addressPostOffice")}
                  />
                  {errors.addressPostOffice && (
                    <p className="text-sm text-destructive">
                      {errors.addressPostOffice.message as string}
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
                  <Input
                    id="addressDistrict"
                    {...register("addressDistrict")}
                  />
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
                <div className="space-y-2">
                  <Label>Board</Label>
                  <Controller
                    control={control}
                    name="sscBoard"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
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
                    {...register("sscPassingYear")}
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
                    {...register("sscGpa")}
                  />
                  {errors.sscGpa && (
                    <p className="text-sm text-destructive">
                      {errors.sscGpa.message as string}
                    </p>
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
              Pick the course, then a batch group. The day and time are filtered
              to that group's slots.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Controller
                control={control}
                name="courseId"
                render={({ field }) => (
                  <Select
                    onValueChange={handleCourseChange}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.length === 0 && (
                        <SelectItem value="none" disabled>
                          No active, open courses available. Create one or
                          re-open a completed course from the Courses page.
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
                <p className="text-sm text-destructive">
                  {errors.courseId.message}
                </p>
              )}
            </div>

            {selectedCourse && (
              <>
                {selectedCourse.batchDays &&
                  selectedCourse.batchDays.length > 0 && (
                    <div className="space-y-2">
                      <Label>Batch Day *</Label>
                      <Controller
                        control={control}
                        name="batchDayId"
                        render={({ field }) => (
                          <Select
                            onValueChange={handleBatchDayChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a batch day" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedCourse.batchDays!.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name} — {d.days.join(", ")} @{" "}
                                  {d.times.join(", ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.batchDayId && (
                        <p className="text-sm text-destructive">
                          {errors.batchDayId.message as string}
                        </p>
                      )}
                    </div>
                  )}

                {selectedBatchDay && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Days</Label>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedBatchDay.days.map((d) => (
                          <Badge key={d} variant="outline">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Time *</Label>
                      <Controller
                        control={control}
                        name="batchTime"
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
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
                        <p className="text-sm text-destructive">
                          {errors.batchTime.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-md border bg-muted/40 p-3 text-xs">
                  <div className="font-medium mb-1">
                    All available batch days:
                  </div>
                  <div className="space-y-1">
                    {selectedCourse.batchDays?.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <Badge variant="outline">{d.name}</Badge>
                        <span className="text-muted-foreground">
                          {d.days.join(", ")}
                        </span>
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
              (mode === "new" && (!selectedCourseId || !selectedBatchDayId))
            }
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "existing" ? "Enroll in Course" : "Admit Student"}
          </Button>
        </div>
      </form>
      {successModal}
      {paymentModal}
      {receiptTarget && (
        <PaymentReceiptView
          payment={receiptTarget.payment}
          studentName={receiptTarget.student.user.name}
          studentId={receiptTarget.student.user.studentId}
          studentMobile={receiptTarget.student.mobile}
          studentBatch={(receiptTarget.student.batches ?? [])
            .map((b) => `HSC ${String(b.hscBatch).replace(/^BATCH_/, "")}`)
            .join(", ")}
          paymentStatus={(() => {
            // Compute the post-payment status. If the staff member
            // picked an override (PAID / PARTIAL / PENDING) we honor
            // it — even when the actual amount paid doesn't cover the
            // full fee. Otherwise fall back to the math: total paid vs
            // fee. This makes the "PAID" badge and PAID seal appear
            // for overrides to PAID regardless of the underlying math.
            const ov = receiptTarget.overrideStatus;
            if (ov && ov !== "_auto") return ov;
            const enrollment = receiptTarget.student.studentCourses?.find(
              (sc) => sc.id === receiptTarget.payment.studentCourseId,
            );
            const fee = Number(enrollment?.course?.fee ?? 0);
            const scId = receiptTarget.payment.studentCourseId;
            const previouslyPaid = (receiptTarget.student.payments ?? [])
              .filter(
                (p) =>
                  p.studentCourseId === scId &&
                  p.id !== receiptTarget.payment.id,
              )
              .reduce((sum, p) => sum + Number(p.amount), 0);
            const totalPaid = previouslyPaid + Number(receiptTarget.payment.amount);
            if (totalPaid >= fee && fee > 0) return "PAID" as const;
            if (totalPaid > 0) return "PARTIAL" as const;
            return "PENDING" as const;
          })()}
          courseName={
            receiptTarget.student.studentCourses?.find(
              (sc) => sc.id === receiptTarget.payment.studentCourseId,
            )?.course?.name
          }
          fee={(() => {
            const sc = receiptTarget.student.studentCourses?.find(
              (s) => s.id === receiptTarget.payment.studentCourseId,
            );
            return sc ? Number(sc.course?.fee ?? 0) : undefined;
          })()}
          previouslyPaid={(() => {
            // Sum all payments for the same enrollment EXCLUDING the
            // one we just recorded (which `student.payments` includes
            // because the modal updated the cache). Without the
            // exclusion we'd double-count it on the receipt.
            const scId = receiptTarget.payment.studentCourseId;
            return (receiptTarget.student.payments ?? [])
              .filter(
                (p) =>
                  p.studentCourseId === scId &&
                  p.id !== receiptTarget.payment.id,
              )
              .reduce((sum, p) => sum + Number(p.amount), 0);
          })()}
          collectedByName={currentUser?.name}
          collectedByRole={currentUser?.role}
          onBack={() => {
            // Closing the receipt fully unwinds the post-admit flow:
            // dismiss the receipt AND the success modal, leaving only
            // the (now-empty) admit form behind. The admin can then
            // start a fresh admit or navigate away — there's nothing
            // else to do from inside the success modal after payment.
            setReceiptTarget(null);
            setSuccessState(null);
          }}
        />
      )}
    </>
  );
};

const AdmitSuccessModal = ({
  student,
  credentials,
  onMakePayment,
  onBackToList,
  onAdmitAnother,
}: {
  student: TStudent;
  credentials: TStudentCredentials;
  onMakePayment: () => void;
  onBackToList: () => void;
  onAdmitAnother: () => void;
}) => {
  const isExisting = Boolean(credentials.alreadyEnrolled);
  const primaryId = isExisting
    ? (credentials.studentCourseId ?? credentials.studentId)
    : credentials.studentId;

  const totalDue = (student.studentCourses ?? []).reduce(
    (sum, sc) =>
      sum +
      Math.max(
        0,
        Number(sc.course?.fee ?? 0) -
          (student.payments ?? [])
            .filter((p) => p.studentCourseId === sc.id)
            .reduce((s, p) => s + Number(p.amount), 0),
      ),
    0,
  );
  const totalPaid = (student.payments ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0,
  );

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onAdmitAnother();
      }}
    >
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-center">
            {isExisting ? "Added to new course" : "Student admitted"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isExisting
              ? `${student.user.name} is now enrolled in the new course. Their existing login (mobile number) is unchanged.`
              : `${student.user.name} has been added. What would you like to do next?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {isExisting ? "Per-Enrollment ID" : "Login credentials"}
            </p>
            {/* <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-mono">
                <span className="text-xs text-muted-foreground block">
                  {isExisting ? "Roll #" : "Student ID"}
                </span>
                <span className="font-semibold">{primaryId}</span>
              </div>
              {!isExisting && (
                <div className="font-mono">
                  <span className="text-xs text-muted-foreground block">
                    Initial Password
                  </span>
                  <span className="font-semibold">
                    {credentials.initialPassword}
                  </span>
                </div>
              )}
            </div> */}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-mono">
                <span className="text-xs text-muted-foreground block">
                  {isExisting ? "Mobile" : "Mobile (Login ID)"}
                </span>
                <span className="font-semibold">{student.mobile ?? "—"}</span>
              </div>
              {!isExisting && (
                <div className="font-mono">
                  <span className="text-xs text-muted-foreground block">
                    Initial Password
                  </span>
                  <span className="font-semibold">
                    {credentials.initialPassword}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-2 h-7 text-xs"
              onClick={() => {
                const value = isExisting
                  ? primaryId
                  : `${credentials.studentId} / ${credentials.initialPassword}`;
                navigator.clipboard.writeText(value);
                toast.success("Copied!");
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              {isExisting ? "Copy roll #" : "Copy credentials"}
            </Button>
          </div>

          {!isExisting && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total due</span>
              <Badge variant={totalDue > 0 ? "warning" : "success"}>
                {totalDue > 0
                  ? `৳${totalDue.toLocaleString()} due`
                  : totalPaid > 0
                    ? `৳${totalPaid.toLocaleString()} paid`
                    : "No charges yet"}
              </Badge>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={onMakePayment}
              className="w-full"
              size="lg"
              disabled={isExisting && totalDue === 0}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Make Payment
              {totalDue > 0 && (
                <span className="ml-2 text-xs opacity-80">
                  ৳{totalDue.toLocaleString()}
                </span>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onBackToList}>
                <ListChecks className="h-4 w-4 mr-1" />
                Back to List
              </Button>
              <Button variant="outline" onClick={onAdmitAnother}>
                <UserPlus className="h-4 w-4 mr-1" />
                Admit Another
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <p className="text-[10px] text-muted-foreground text-center">
            Admins can re-find this student anytime from the Students page.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdmitStudentForm;
