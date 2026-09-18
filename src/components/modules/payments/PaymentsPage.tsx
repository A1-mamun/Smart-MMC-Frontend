"use client";
import { useEffect, useMemo, useState } from "react";
import { Filter, Search, Wallet, X } from "lucide-react";
import {
  useGetAllPaymentsQuery,
  useGetDuePaymentsQuery,
} from "@/redux/features/payment/payment";
import { useGetStudentByIdQuery } from "@/redux/features/student/student";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";
import { formatPaymentMethodLabel } from "@/constants/labels";
import RecordPaymentModal, {
  type TCoursePaymentSummary,
} from "@/components/modules/payments/RecordPaymentModal";
import PaymentReceiptView from "@/components/modules/payments/PaymentReceiptView";
import PrintReceiptButton from "@/components/modules/payments/PrintReceiptButton";
import { printPaymentReceipt } from "@/utils/printReceipt";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import type { TPaymentRecord } from "@/types/payment";
import PaymentSeal from "./PaymentSeal";

type PayTarget = {
  studentId: string;
  preselect: TCoursePaymentSummary;
};

type ReceiptTarget = {
  payment: TPaymentRecord;
  studentName: string;
  studentId: string;
  studentMobile?: string;
  studentBatch?: string;
  paymentStatus?: "PAID" | "PARTIAL" | "PENDING";
  courseName?: string;
  fee?: number;
  previouslyPaid?: number;
};

// Consolidated query state for the All Payments tab. The backend's
// `getAllPaymentsSchema` accepts every field on this shape directly, so
// this object can be spread into the RTK Query hook.
type TPaymentQuery = {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  searchTerm?: string;
  method?: "CASH" | "BKASH" | "NAGAD" | "BANK" | "OTHER";
  courseId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

const SEARCH_DEBOUNCE_MS = 350;
const PAYMENT_METHODS: Array<{
  value: Exclude<TPaymentQuery["method"], undefined> | "_all";
  label: string;
}> = [
  { value: "_all", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

const formatCourseName = (name?: string) => {
  if (!name) return "—";
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "HSC Final Preparation",
    ADMISSION: "Admission",
  };
  return map[name] ?? name.replace(/_/g, " ");
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-muted-foreground">
    {children}
  </label>
);

const PaymentsPage = () => {
  // Single source of truth for the All Payments list. Page defaults match
  // the backend's `calculatePagination` defaults (page 1, limit 20,
  // createdAt desc) so the query is stable on first render.
  const [query, setQuery] = useState<TPaymentQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Local mirror of the search box — debounced into `query.searchTerm` by
  // the effect below so we don't fire a request on every keystroke.
  const [search, setSearch] = useState<string>(query.searchTerm ?? "");

  // Independent search state for the Due Payments tab. Kept separate
  // from the All Payments `search` because the two tabs use different
  // query shapes (`useGetAllPaymentsQuery` takes the consolidated
  // `TPaymentQuery`; `useGetDuePaymentsQuery` takes just `{ searchTerm }`)
  // and the user expects each tab to retain its own search value when
  // they switch between them.
  const [dueSearch, setDueSearch] = useState<string>("");
  const [dueSearchTerm, setDueSearchTerm] = useState<string | undefined>(
    undefined,
  );

  // refetchOnMountOrArgChange forces a fresh fetch when the user switches
  // tabs or after a new payment is recorded (we still call refetch()
  // explicitly below so the page count and "All Payments" list update
  // immediately).
  //
  // We pass a *transformed* copy of `query` to the hook: the local
  // `startDate` / `endDate` are kept as YYYY-MM-DD strings so the inputs
  // stay controlled, but the backend's `paidAt` filter is a `DateTime`
  // comparison — so here we expand them into ISO timestamps with the
  // right inclusivity. `endDate` gets bumped to the END of the chosen
  // day so a user picking "Sep 19" sees every payment made at any time
  // on Sep 19, not just those before midnight.
  const backendQuery = useMemo(() => {
    const { startDate, endDate, ...rest } = query;
    const transformed: Record<string, unknown> = { ...rest };
    if (startDate)
      transformed.startDate = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate)
      transformed.endDate = new Date(`${endDate}T23:59:59.999`).toISOString();
    return transformed;
  }, [query]);

  const {
    data,
    isLoading,
    refetch: refetchAll,
  } = useGetAllPaymentsQuery(backendQuery, { refetchOnMountOrArgChange: true });
  const { data: dueData, refetch: refetchDue } = useGetDuePaymentsQuery(
    // Pass the debounced term so the URL only fires once per search
    // burst. `searchTerm` is undefined when the input is empty, which
    // makes RTK Query send no query string at all — the backend then
    // returns the full unfiltered list.
    dueSearchTerm ? { searchTerm: dueSearchTerm } : undefined,
    { refetchOnMountOrArgChange: true },
  );

  // Course filter dropdown — reuses the same query the rest of the app
  // uses for course lists.
  const { data: coursesData } = useGetAllCoursesQuery(
    { isActive: true, limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];

  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  // Drives the receipt dialog. Set both when a payment is just recorded
  // (auto-open) and when the user clicks a row's Print action.
  const [receiptTarget, setReceiptTarget] = useState<ReceiptTarget | null>(
    null,
  );
  // When the user clicks a row's printer icon we set the row's payment here
  // and trigger a `useGetStudentByIdQuery` (below) so we can build a full
  // receipt with mobile / batch / status / breakdown.
  const [rowPrintTarget, setRowPrintTarget] = useState<TPaymentRecord | null>(
    null,
  );
  const currentUser = useAppSelector(useCurrentUser);

  // Build a rich receipt from a payment + full student profile. Used by both
  // the row-print flow (after fetching the student) and the post-success flow
  // (after `onRecorded` fires with the student already loaded).
  const buildReceiptFromStudent = (
    payment: TPaymentRecord,
    student: NonNullable<typeof studentDetail>["data"] | null,
  ): ReceiptTarget | null => {
    if (!student) return null;

    const scId = payment.studentCourseId ?? undefined;
    const summary = (student.studentCourses ?? [])
      .filter((sc) => !sc.isCompleted)
      .map((sc) => {
        // Subtotal of all payments for this enrollment EXCLUDING the
        // current one — this becomes the "previouslyPaid" line on the
        // receipt. Without excluding the current payment we double-
        // count it (since `student.payments` is the post-record list and
        // already contains the payment we're building a receipt for).
        const paidBefore = (student.payments ?? [])
          .filter((p) => p.studentCourseId === sc.id && p.id !== payment.id)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          studentCourseId: sc.id,
          courseName: sc.course?.name ?? "Course",
          fee: Number(sc.course?.fee ?? 0),
          paidBefore,
        };
      })
      .find((s) => s.studentCourseId === scId);

    const batchLabel = (student.batches ?? [])
      .map((b) => `HSC ${String(b.hscBatch).replace(/^BATCH_/, "")}`)
      .join(", ");

    return {
      payment,
      studentName: student.user.name,
      studentId: student.user.studentId,
      studentMobile: student.mobile,
      studentBatch: batchLabel || undefined,
      paymentStatus: student.paymentStatus,
      courseName: summary?.courseName ?? payment.studentCourse?.course?.name,
      fee: summary?.fee,
      previouslyPaid: summary?.paidBefore,
    };
  };

  // Minimal receipt built only from the payment row — used as a fallback when
  // the student profile can't be fetched (e.g. offline / 404). Missing fields
  // render as "—" on the receipt.
  const buildReceiptFromRow = (payment: TPaymentRecord): ReceiptTarget => ({
    payment,
    studentName: payment.student?.user?.name || "—",
    studentId: payment.student?.user?.studentId || "—",
    courseName: payment.studentCourse?.course?.name,
  });

  // Build the receipt for a payment that was just recorded (the modal already
  // loaded the student, so we always have the data).
  const buildReceiptFromRecorded = (
    payment: TPaymentRecord,
  ): ReceiptTarget | null =>
    buildReceiptFromStudent(payment, studentDetail?.data ?? null) ??
    buildReceiptFromRow(payment);

  // Lazy-load full student detail when "Pay" is clicked.
  const { data: studentDetail, isFetching: studentLoading } =
    useGetStudentByIdQuery(payTarget?.studentId || "", {
      skip: !payTarget,
    });

  // Row-print fetch: when the user clicks a row's printer icon we set
  // `rowPrintTarget` and trigger a second, independent fetch for that student
  // so we can build a receipt with mobile / batch / status / breakdown. The
  // effect below triggers `window.print()` once the data arrives.
  const { data: rowStudentData, isFetching: rowStudentLoading } =
    useGetStudentByIdQuery(rowPrintTarget?.studentId || "", {
      skip: !rowPrintTarget,
    });

  useEffect(() => {
    if (!rowPrintTarget) return;
    if (rowStudentLoading) return;
    const student = rowStudentData?.data ?? null;
    const target =
      buildReceiptFromStudent(rowPrintTarget, student) ??
      buildReceiptFromRow(rowPrintTarget);
    printPaymentReceipt({
      payment: target.payment,
      studentName: target.studentName,
      studentId: target.studentId,
      studentMobile: target.studentMobile,
      studentBatch: target.studentBatch,
      paymentStatus: target.paymentStatus,
      courseName: target.courseName,
      fee: target.fee,
      previouslyPaid: target.previouslyPaid,
      collectedByName: currentUser?.name,
      collectedByRole: currentUser?.role,
    });
    // Clear the target so a re-click of the same row's print button works.
    setRowPrintTarget(null);
  }, [rowPrintTarget, rowStudentData, rowStudentLoading, currentUser]);

  const handleOpenPay = (record: any) => {
    const preselect: TCoursePaymentSummary = {
      // The /payment/due endpoint now returns the StudentCourse id under
      // `studentCourseId` so the modal's course selector can preselect the
      // correct enrollment automatically (important if a student is
      // enrolled in two batches of the same course).
      studentCourseId: record.studentCourseId ?? "",
      courseName: record.courseName,
      fee: record.totalFee,
      paid: record.paid,
      due: record.due,
    };
    setPayTarget({ studentId: record.studentId, preselect });
  };

  const closePay = () => {
    setPayTarget(null);
  };

  const onPaymentRecorded = (payment: TPaymentRecord) => {
    // Auto-open the receipt dialog right after a successful payment so the
    // staff member can print and hand it to the student immediately.
    const target = buildReceiptFromRecorded(payment);
    if (target) setReceiptTarget(target);
  };

  const onPaymentSuccess = async () => {
    closePay();
    // After a new payment is recorded, jump back to page 1 so the new row
    // is visible, then refetch both lists. Page reset only — we keep the
    // active filters and sort in place so the user lands on the same view.
    if (query.page !== 1) {
      setQuery({ ...query, page: 1 });
    }
    await Promise.all([refetchAll(), refetchDue()]);
  };

  // Row-level print action: trigger a fetch for the full student profile so
  // the printed receipt has mobile / batch / status / breakdown. The actual
  // print is dispatched by the effect above once the data lands.
  const handleRowPrint = (payment: TPaymentRecord) => {
    setRowPrintTarget(payment);
  };

  const closeReceipt = () => setReceiptTarget(null);

  // ── Search debounce ────────────────────────────────────────────────────
  // Mirrors the pattern from Exams / Students: local `search` state is the
  // source of truth for the input, and we push it into the consolidated
  // `query.searchTerm` after `SEARCH_DEBOUNCE_MS` of idle. Page resets to
  // 1 on every search so a result on page 4 doesn't drop the user on an
  // empty trailing page when the result set shrinks.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = search.trim() || undefined;
      if ((query.searchTerm ?? undefined) === next) return;
      setQuery({ ...query, searchTerm: next, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query.searchTerm]);

  const clearSearch = () => {
    setSearch("");
    if (query.searchTerm !== undefined) {
      setQuery({ ...query, searchTerm: undefined, page: 1 });
    }
  };

  // Due Payments search debounce. Same pattern as the All Payments
  // debounce above, but bound to its own pair of states so each tab
  // remembers its own search term when the user switches between them.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = dueSearch.trim() || undefined;
      if (dueSearchTerm === next) return;
      setDueSearchTerm(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueSearch, dueSearchTerm]);

  const clearDueSearch = () => {
    setDueSearch("");
    setDueSearchTerm(undefined);
  };

  // ── Filter card ────────────────────────────────────────────────────────
  // `clearFilters` resets search/filter/sort back to the page defaults but
  // intentionally leaves `limit` alone — page size is a view preference,
  // not a filter, so "Clear all" shouldn't shrink the table back to 20.
  const clearFilters = () => {
    setSearch("");
    setQuery({
      page: 1,
      limit: query.limit, // preserved — not a filter
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  // Flags anything that diverges from the page's default state.
  // `limit` is intentionally not included.
  const hasActiveFilter =
    !!query.searchTerm ||
    !!query.method ||
    !!query.courseId ||
    !!query.startDate ||
    !!query.endDate ||
    query.sortBy !== "createdAt" ||
    query.sortOrder !== "desc";

  // Sort options — 4 outcome-named pairs over the two most useful
  // `Payment` columns. We restrict to top-level columns because the
  // backend orders by `student: { ... }` relations via a different
  // expression shape than `{ [sortBy]: sortOrder }` — keeping it simple
  // avoids an extra backend codepath for a feature admin rarely needs.
  const SORT_OPTIONS = [
    {
      key: "newest",
      label: "Newest first",
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    {
      key: "oldest",
      label: "Oldest first",
      sortBy: "createdAt",
      sortOrder: "asc",
    },
    {
      key: "amountDesc",
      label: "Largest amount first",
      sortBy: "amount",
      sortOrder: "desc",
    },
    {
      key: "amountAsc",
      label: "Smallest amount first",
      sortBy: "amount",
      sortOrder: "asc",
    },
  ] as const;
  type SortKey = (typeof SORT_OPTIONS)[number]["key"];

  const currentSortKey: SortKey =
    SORT_OPTIONS.find(
      (o) => o.sortBy === query.sortBy && o.sortOrder === query.sortOrder,
    )?.key ?? "newest";

  // Memoised meta extraction for the footer.
  const meta = (data?.meta as
    | { page: number; limit: number; total: number }
    | undefined) ?? { page: 1, limit: 20, total: 0 };
  const list: TPaymentRecord[] =
    (data?.data as TPaymentRecord[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        {/* <PaymentSeal /> */}
        <p className="text-sm text-muted-foreground">
          All payment records across the institute
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="due">Due Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Records ({data?.meta?.total || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── Search bar ────────────────────────────────────────── */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, BD-code, or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = search.trim() || undefined;
                      if ((query.searchTerm ?? undefined) === next) return;
                      setQuery({ ...query, searchTerm: next, page: 1 });
                    }
                  }}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* ── Filter card ───────────────────────────────────────── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="ml-auto h-7"
                      >
                        Clear all
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-4">
                    {/* Method */}
                    <div className="space-y-1">
                      <Label>Method</Label>
                      <Select
                        value={query.method ?? "_all"}
                        onValueChange={(v) =>
                          setQuery({
                            ...query,
                            method:
                              v === "_all"
                                ? undefined
                                : (v as Exclude<
                                    TPaymentQuery["method"],
                                    undefined
                                  >),
                            page: 1,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All methods" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Course */}
                    <div className="space-y-1">
                      <Label>Course</Label>
                      <Select
                        value={query.courseId ?? "_all"}
                        onValueChange={(v) =>
                          setQuery({
                            ...query,
                            courseId: v === "_all" ? undefined : v,
                            page: 1,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All courses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All courses</SelectItem>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {formatCourseName(c.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date range — start */}
                    <div className="space-y-1">
                      <Label>Paid from</Label>
                      <Input
                        type="date"
                        value={query.startDate ?? ""}
                        onChange={(e) =>
                          setQuery({
                            ...query,
                            startDate: e.target.value || undefined,
                            page: 1,
                          })
                        }
                      />
                    </div>

                    {/* Date range — end */}
                    <div className="space-y-1">
                      <Label>Paid until</Label>
                      <Input
                        type="date"
                        value={query.endDate ?? ""}
                        onChange={(e) => {
                          const v = e.target.value || undefined;
                          setQuery({
                            ...query,
                            endDate: v,
                            page: 1,
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Sort on its own row so the dropdown gets full width
                      and doesn't crowd the filter cells on narrow screens. */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1 md:col-span-1">
                      <Label>Sort by</Label>
                      <Select
                        value={currentSortKey}
                        onValueChange={(v) => {
                          const opt = SORT_OPTIONS.find((o) => o.key === v);
                          if (!opt) return;
                          setQuery({
                            ...query,
                            sortBy: opt.sortBy,
                            sortOrder: opt.sortOrder,
                            page: 1,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Newest first" />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((o) => (
                            <SelectItem key={o.key} value={o.key}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Table ────────────────────────────────────────────── */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-20 text-center text-muted-foreground"
                        >
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : list.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-20 text-center text-muted-foreground"
                        >
                          No payments match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      list.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.student?.user?.name || "—"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ৳{Number(p.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatPaymentMethodLabel(p.method)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatCourseName(p.studentCourse?.course?.name)}
                          </TableCell>
                          <TableCell>
                            {p.paidAt
                              ? dayjs(p.paidAt).format("MMM D, YYYY")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <PrintReceiptButton
                              iconOnly
                              onPrint={() => handleRowPrint(p)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination footer ────────────────────────────────── */}
              {/* Mirrors the Exams / Students pattern: always render the
                  strip when meta exists so the page-size selector is
                  visible even on a single page; Previous/Next stay gated
                  on `total > limit` so they don't render as redundant
                  "Page 1 of 1" noise. */}
              {data?.meta && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page</span>
                    <Select
                      value={String(query.limit)}
                      onValueChange={(v) =>
                        setQuery({
                          ...query,
                          limit: Number(v),
                          page: 1,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {data.meta.total > data.meta.limit && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={meta.page <= 1}
                        onClick={() =>
                          setQuery({ ...query, page: meta.page - 1 })
                        }
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={meta.page * meta.limit >= meta.total}
                        onClick={() =>
                          setQuery({ ...query, page: meta.page + 1 })
                        }
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="due">
          <Card>
            <CardHeader>
              <CardTitle>Due Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── Search bar ──────────────────────────────────────────
                  Mirrors the All Payments search above: same input shape,
                  same 350ms debounce (driven by the dueSearch →
                  dueSearchTerm effect below). The clear-X button only
                  appears once the user types so the input doesn't have
                  a dangling icon when empty. */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, BD-code, or mobile..."
                  value={dueSearch}
                  onChange={(e) => setDueSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = dueSearch.trim() || undefined;
                      if (dueSearchTerm !== next) {
                        setDueSearchTerm(next);
                      }
                    }
                  }}
                  className="pl-9 pr-9"
                />
                {dueSearch && (
                  <button
                    type="button"
                    onClick={clearDueSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {dueData?.data?.summary && (
                <div className="grid gap-3 md:grid-cols-2 mb-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">
                        Students with due
                      </p>
                      <p className="text-2xl font-bold">
                        {dueData.data.summary.totalDueStudents}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">
                        Total due amount
                      </p>
                      <p className="text-2xl font-bold">
                        ৳{dueData.data.summary.totalDueAmount.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueData?.data?.records?.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-20 text-center text-muted-foreground"
                        >
                          {dueSearchTerm
                            ? `No due payments match "${dueSearchTerm}".`
                            : "No dues — all payments completed!"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      dueData?.data?.records?.map((r, i) => (
                        <TableRow key={`${r.studentId}-${r.courseId}-${i}`}>
                          <TableCell>
                            <div className="font-medium">{r.studentName}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {r.studentUserId}
                            </div>
                          </TableCell>
                          <TableCell>
                            {r.courseName.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>৳{r.totalFee.toLocaleString()}</TableCell>
                          <TableCell className="text-emerald-600">
                            ৳{r.paid.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-destructive font-semibold">
                            ৳{r.due.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleOpenPay(r)}>
                              <Wallet className="h-4 w-4" /> Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {payTarget && studentDetail?.data && (
        <RecordPaymentModal
          open={!!payTarget}
          onClose={closePay}
          student={studentDetail.data}
          preselect={payTarget.preselect}
          onSuccess={onPaymentSuccess}
          onRecorded={onPaymentRecorded}
        />
      )}

      {payTarget && studentLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center text-white text-sm">
          Loading student…
        </div>
      )}

      {receiptTarget && (
        <PaymentReceiptView
          payment={receiptTarget.payment}
          studentName={receiptTarget.studentName}
          studentId={receiptTarget.studentId}
          studentMobile={receiptTarget.studentMobile}
          studentBatch={receiptTarget.studentBatch}
          paymentStatus={receiptTarget.paymentStatus}
          courseName={receiptTarget.courseName}
          fee={receiptTarget.fee}
          previouslyPaid={receiptTarget.previouslyPaid}
          collectedByName={currentUser?.name}
          collectedByRole={currentUser?.role}
          onBack={closeReceipt}
        />
      )}
    </div>
  );
};

export default PaymentsPage;
