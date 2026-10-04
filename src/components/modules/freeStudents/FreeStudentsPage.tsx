"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X as ClearIcon, Gift } from "lucide-react";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StudentsTable from "@/components/modules/students/StudentsTable";
import type { TStudentQuery } from "@/types/student";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Roster of free-class accounts. Reuses the shared `getAllStudents`
 * endpoint with `isFreeAccount: true` so the backend filter does the
 * heavy lifting. We deliberately keep this surface slimmer than the
 * paid `/dashboard/students` page — no cascading course/batch filters,
 * because free students don't enroll in any.
 *
 * Search is the only filter exposed: by name, student ID, mobile, or
 * district (mirrors the backend's `searchTerm` OR clause on the paid
 * list). Pagination + sorting match the paid surface so the table
 * behaves identically when admins tab between the two.
 *
 * Why `isFreeAccount: true` is non-negotiable here:
 *  - Paid-only students have `isFreeAccount = false` (the column
 *    default), so they never appear in the WHERE result.
 *  - A free student who is later admitted to a paid course has their
 *    `isFreeAccount` flag flipped to `false` on both the `Student`
 *    and `User` rows (see `student.service.ts` admit path) — so
 *    converted students disappear from this roster the moment they
 *    become paying customers.
 *  - Defense-in-depth: the backend ALSO adds `studentCourses: { none:
 *    { isDeleted: false } }` to the WHERE, so a paying student whose
 *    `isFreeAccount` flag is somehow stale (failed transaction, backfill,
 *    future admit path that forgets the flip) is still excluded as long
 *    as they have an active paid enrollment. A student on this list is
 *    therefore guaranteed to be free AND unenrolled.
 * Removing the filter (or flipping it to `false`) would either show
 * the entire student base or silently include paid customers; do not.
 */
const FreeStudentsPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState<TStudentQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    // Hard-locked: this page must ONLY ever show currently-free
    // accounts. Free→paid conversions flip the flag to false, so any
    // student who has been admitted to a paid course drops out of
    // this list automatically — we never have to clean it up by hand.
    isFreeAccount: true,
  });
  const [searchInput, setSearchInput] = useState(query.searchTerm || "");
  const { data, isLoading, isFetching, refetch } = useGetAllStudentsQuery(
    query,
    // Always refetch when the page mounts or the query object changes,
    // even if the RTK Query cache entry is still warm. The server-side
    // GET /student endpoint is cached at 60s; this client-side flag
    // means the user never sees a stale free roster when they tab in.
    // Server cache invalidations (clearStudentCache on enroll/unenroll)
    // keep the data fresh enough that this only triggers one extra
    // request on the first visit.
    { refetchOnMountOrArgChange: true },
  );

  // Debounced search — mirrors the paid Students page so the typing
  // experience is identical.
  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = searchInput.trim() || undefined;
      if ((query.searchTerm || undefined) === trimmed) return;
      setQuery({ ...query, searchTerm: trimmed, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const clearSearch = () => {
    setSearchInput("");
    setQuery({ ...query, searchTerm: undefined, page: 1 });
  };

  const students = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Free Students
          </h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? `${meta.total} free-class account${meta.total === 1 ? "" : "s"}`
              : "Loading..."}
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, student ID, mobile, district..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const trimmed = searchInput.trim() || undefined;
              if ((query.searchTerm || undefined) !== trimmed) {
                setQuery({ ...query, searchTerm: trimmed, page: 1 });
              }
            }
          }}
          className="pl-9 pr-9"
        />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <ClearIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <StudentsTable
        students={students}
        isLoading={isLoading}
        isFetching={isFetching}
        onView={(s) => router.push(`/dashboard/students/${s.id}`)}
        onEdit={(s) => router.push(`/dashboard/students/${s.id}/edit`)}
        // No payment or per-row SMS action on the free roster — these
        // students don't carry fee / payment / NFC semantics. The shared
        // StudentsTable already hides these icons when the handlers are
        // omitted, so omitting them is enough.
      />

      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() =>
              setQuery({ ...query, page: (meta.page || 1) - 1 })
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
              setQuery({ ...query, page: (meta.page || 1) + 1 })
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default FreeStudentsPage;