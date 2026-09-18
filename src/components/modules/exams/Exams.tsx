"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, Filter, Calendar, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAllCoursesQuery } from "@/redux/features/course/course";
import { useLazyGetExamByIdQuery } from "@/redux/features/exam/exam";
import ExamFormModal from "./ExamFormModal";
import type { TExamListItem, TExam } from "@/types/exam";
import type { TPaginationMeta } from "@/types/common";
import dayjs from "dayjs";

type ExamsProps = {
  exams: TExamListItem[];
  meta: TPaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  query: Record<string, unknown>;
  onQueryChange: (q: Record<string, unknown>) => void;
  refetch: () => void;
};

const SEARCH_DEBOUNCE_MS = 350;

const formatCourseName = (name?: string) => {
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "HSC Final Preparation",
    ADMISSION: "Admission",
  };
  return (name && map[name]) || name || "—";
};

const Exams = ({
  exams,
  meta,
  isLoading,
  isFetching,
  query,
  onQueryChange,
  refetch,
}: ExamsProps) => {
  const [search, setSearch] = useState<string>(
    (query.searchTerm as string) ?? "",
  );
  const [editing, setEditing] = useState<TExam | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // The list endpoint (`/exam`) does NOT include `sections` on each row —
  // it only carries the section count via `_count`. When the user clicks
  // Edit we lazy-fetch the detail endpoint and pass a fully-hydrated exam
  // to the form modal, otherwise `form.reset({ sections: exam.sections.map(...) })`
  // crashes on `undefined.map`.
  const [fetchExamDetail, { isFetching: fetchingDetail }] =
    useLazyGetExamByIdQuery();
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  const openEdit = async (id: string) => {
    setEditLoadingId(id);
    try {
      const res = await fetchExamDetail(id).unwrap();
      const d = res.data;
      if (!d) {
        throw new Error("Empty exam detail response");
      }
      // `TExamDetail` extends `TExam`, so we can safely spread the detail
      // payload into a TExam — every TExam field is present on TExamDetail.
      // We deliberately drop `roster`/`topTen`/`stats` (TExam doesn't carry
      // them) and keep `sections`/`totalMarks`/etc. that the form needs.
      const hydrated: TExam = {
        id: d.id,
        title: d.title,
        syllabus: d.syllabus,
        examDate: d.examDate,
        courseId: d.courseId,
        course: d.course,
        totalMarks: d.totalMarks,
        isResultPublished: d.isResultPublished,
        publishedAt: d.publishedAt ?? null,
        sections: d.sections,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        _count: d._count,
      };
      setEditing(hydrated);
    } catch (e) {
      const msg =
        (e as { data?: { message?: string } })?.data?.message ??
        "Failed to load exam";
      // eslint-disable-next-line no-console
      console.error(msg);
    } finally {
      setEditLoadingId(null);
    }
  };

  // Course filter dropdown
  const { data: coursesData } = useGetAllCoursesQuery(
    { isActive: true, limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const courses = coursesData?.data || [];
  const courseId = (query.courseId as string) ?? "";

  // Push the search box's text into the parent query after a short debounce.
  // We deliberately read `query.searchTerm` from the latest render's prop (not
  // a stale closure) by including `query.searchTerm` in the deps so the effect
  // re-evaluates whenever the parent query updates.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = search.trim() || undefined;
      if ((query.searchTerm as string | undefined) === next) return;
      onQueryChange({ ...query, searchTerm: next, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // We intentionally key the effect off `search` + the parent comparison
    // value so a parent re-render with a stale closure can't drop keystrokes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query.searchTerm]);

  const clearSearch = () => {
    setSearch("");
    onQueryChange({ ...query, searchTerm: undefined, page: 1 });
  };

  const clearFilters = () => {
    setSearch("");
    onQueryChange({
      ...query,
      searchTerm: undefined,
      courseId: undefined,
      isResultPublished: undefined,
      // Reset to the page-default sort so "Clear all" puts the user back
      // to the "Newest first" view they started with.
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
    });
  };

  // `hasActiveFilter` flags anything other than the default sort so the
  // "Clear all" button surfaces when the user has touched a filter.
  const hasActiveFilter =
    !!search ||
    !!courseId ||
    query.isResultPublished !== undefined ||
    query.sortBy !== "createdAt" ||
    query.sortOrder !== "desc";

  // Sort dropdown options. Each key encodes the (sortBy, sortOrder) pair
  // so the user picks an outcome rather than two abstract controls. The
  // default key (`newest`) matches `ExamsPage.tsx`'s initial query state.
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
      key: "dateSoonest",
      label: "Exam date — soonest first",
      sortBy: "examDate",
      sortOrder: "asc",
    },
    {
      key: "dateLatest",
      label: "Exam date — latest first",
      sortBy: "examDate",
      sortOrder: "desc",
    },
    {
      key: "titleAsc",
      label: "Title A → Z",
      sortBy: "title",
      sortOrder: "asc",
    },
    {
      key: "titleDesc",
      label: "Title Z → A",
      sortBy: "title",
      sortOrder: "desc",
    },
  ] as const;
  type SortKey = (typeof SORT_OPTIONS)[number]["key"];

  // Derive the current Sort dropdown value from the query. Anything other
  // than a known pair falls back to the default `newest` shown on screen,
  // so the Select never lands on a blank value.
  const currentSortKey: SortKey =
    SORT_OPTIONS.find(
      (o) => o.sortBy === query.sortBy && o.sortOrder === query.sortOrder,
    )?.key ?? "newest";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exams</h2>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total exams` : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Create exam
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or syllabus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const next = search.trim() || undefined;
                if ((query.searchTerm as string | undefined) === next) return;
                onQueryChange({ ...query, searchTerm: next, page: 1 });
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
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Course</Label>
                <Select
                  value={courseId || "_all"}
                  onValueChange={(v) => {
                    const next = v === "_all" ? undefined : v;
                    onQueryChange({ ...query, courseId: next, page: 1 });
                  }}
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
              <div className="space-y-1">
                <Label>Result status</Label>
                <Select
                  value={
                    query.isResultPublished === undefined
                      ? "_all"
                      : query.isResultPublished
                        ? "published"
                        : "draft"
                  }
                  onValueChange={(v) => {
                    // Map the Select sentinel value ("_all") back to an
                    // `undefined` filter so the backend receives no
                    // `isResultPublished` param at all. The previous
                    // version checked `v === "all"` (no underscore) and
                    // therefore never matched — every selection silently
                    // became "draft".
                    const next =
                      v === "_all"
                        ? undefined
                        : v === "published"
                          ? true
                          : false;
                    onQueryChange({
                      ...query,
                      isResultPublished: next,
                      page: 1,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sort by</Label>
                <Select
                  value={currentSortKey}
                  onValueChange={(v) => {
                    const opt = SORT_OPTIONS.find((o) => o.key === v);
                    if (!opt) return;
                    onQueryChange({
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
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total marks</TableHead>
              <TableHead className="text-right">Sections</TableHead>
              <TableHead className="text-right">Examinees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || isFetching ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : exams.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No exams yet. Click "Create exam" to add one.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/exams/${exam.id}`}
                      className="hover:underline"
                    >
                      {exam.title}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCourseName(exam.course?.name)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {dayjs(exam.examDate).format("DD MMM YYYY")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {exam.totalMarks}
                  </TableCell>
                  <TableCell className="text-right">
                    {exam._count?.sections ?? exam.sections?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {exam._count?.results ?? 0}
                  </TableCell>
                  <TableCell>
                    {exam.isResultPublished ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/dashboard/exams/${exam.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!exam.isResultPublished && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={editLoadingId === exam.id || fetchingDetail}
                          onClick={() => openEdit(exam.id)}
                          aria-label={`Edit ${exam.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {meta && (
        <div className="flex items-center justify-between gap-2">
          {/* Page-size selector. Always visible (even on a single page) so
              the admin can shrink or grow the view without having to first
              paginate elsewhere. The page count below is the only thing
              gated on `total > limit` — when there's only one page, the
              "Page X of Y" indicator is redundant noise. */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(query.limit ?? 20)}
              onValueChange={(v) => {
                onQueryChange({
                  ...query,
                  limit: Number(v),
                  // Page must reset to 1 on size change — otherwise a user
                  // on page 5 of 20/page who picks 100 could land on a
                  // half-empty trailing page.
                  page: 1,
                });
              }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Backend's validation caps `limit` at 100, so we don't
                    offer anything above that. */}
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {meta.total > meta.limit && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() =>
                  onQueryChange({ ...query, page: (meta.page || 1) - 1 })
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
                  onQueryChange({ ...query, page: (meta.page || 1) + 1 })
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {(showCreate || editing) && (
        <ExamFormModal
          open={!!(showCreate || editing)}
          exam={editing}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          onSaved={async () => {
            // Close the modal first so the user gets immediate feedback.
            // We then explicitly force a fresh fetch via the parent's
            // `refetch()` (in addition to the LIST-tag invalidation that
            // the mutation triggers internally). Without this, the table
            // sometimes rendered the empty state until the page was
            // manually reloaded — the cached response was marked stale
            // but the refetch wasn't being kicked off in time.
            setShowCreate(false);
            setEditing(null);
            try {
              await refetch();
            } catch {
              /* refetch failures surface via the query state itself */
            }
          }}
        />
      )}
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-muted-foreground">
    {children}
  </label>
);

export default Exams;
