"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Filter, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAllActivitiesQuery } from "@/redux/features/activityLog/activityLog";
import { TPaginationMeta } from "@/types/common";

// Consolidated query state. Mirrors the shape used by Exams / Students /
// Payments so every list page in the app reads the same way. Every field
// here maps 1:1 to the backend's `getAllActivitySchema`, so we can spread
// the object straight into the RTK Query hook.
type TActivityQuery = {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  searchTerm?: string;
};

const SEARCH_DEBOUNCE_MS = 350;

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-muted-foreground">
    {children}
  </label>
);

const ActivityLogPage = () => {
  // Default sort (newest first) and page size (20) match the backend's
  // `calculatePagination` defaults so the first render is stable.
  const [query, setQuery] = useState<TActivityQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Local mirror of the search box — debounced into `query.searchTerm`
  // by the effect below so we don't fire a request on every keystroke.
  const [search, setSearch] = useState<string>(query.searchTerm ?? "");

  const { data, isLoading, isFetching } = useGetAllActivitiesQuery(query, {
    refetchOnMountOrArgChange: true,
  });

  // ── Search debounce ────────────────────────────────────────────────────
  // Push the local search text into the consolidated query after
  // SEARCH_DEBOUNCE_MS of idle. Page resets to 1 on every search so a
  // result that lives on page 4 doesn't drop the user on an empty
  // trailing page when the result set shrinks.
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

  // "Clear all" resets the search box and the consolidated query back to
  // the page defaults. `limit` is intentionally preserved — page size is
  // a view preference, not a filter, so "Clear all" shouldn't shrink the
  // table back to 20.
  const clearFilters = () => {
    setSearch("");
    setQuery({
      page: 1,
      limit: query.limit,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  // Flags anything that diverges from the page's default state.
  const hasActiveFilter =
    !!query.searchTerm ||
    query.sortBy !== "createdAt" ||
    query.sortOrder !== "desc";

  const meta: TPaginationMeta =
    (data?.meta as TPaginationMeta | undefined) ?? {
      page: 1,
      limit: 20,
      total: 0,
    };
  const activities = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-sm text-muted-foreground">
          System events across all admins
        </p>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by description, action, entity, or UUID..."
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

      {/* ── Filter card ────────────────────────────────────────────── */}
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
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-1">
              <Label>Sort by</Label>
              <Select
                value={
                  query.sortBy === "createdAt" && query.sortOrder === "desc"
                    ? "newest"
                    : "oldest"
                }
                onValueChange={(v) =>
                  setQuery({
                    ...query,
                    sortBy: "createdAt",
                    sortOrder: v === "newest" ? "desc" : "asc",
                    page: 1,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({meta.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isFetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      {query.searchTerm
                        ? `No activity matches "${query.searchTerm}".`
                        : "No activity yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {a.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.entityType}
                        {a.entityId ? ` • ${a.entityId.slice(0, 8)}…` : ""}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="text-sm">
                          {dayjs(a.createdAt).format("MMM D, YYYY")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(a.createdAt).format("h:mm A")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination footer ─────────────────────────────────────── */}
          {/* Mirrors the Exams / Students / Payments pattern: always
              render the strip when meta exists so the page-size selector
              is visible even on a single page; Previous/Next stay gated
              on `total > limit` so they don't render as redundant
              "Page 1 of 1" noise. */}
          {data?.meta && (
            <div className="mt-4 flex items-center justify-between gap-2">
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
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Backend's validation caps `limit` at 100. */}
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
                      setQuery({ ...query, page: meta.page - 1 })
                    }
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {meta.page} of{" "}
                    {Math.ceil(meta.total / meta.limit)}
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
    </div>
  );
};

export default ActivityLogPage;
