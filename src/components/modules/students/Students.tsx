"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TStudent, TStudentQuery } from "@/types/student";
import { hscBatches } from "@/constants/batches";
import { TPaginationMeta } from "@/types/common";
import StudentsTable from "./StudentsTable";
import RecordPaymentModal from "@/components/modules/payments/RecordPaymentModal";

type StudentsProps = {
  studentsData: TStudent[];
  meta?: TPaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  query: TStudentQuery;
  onQueryChange: (q: TStudentQuery) => void;
  refetch: () => void;
};

const SEARCH_DEBOUNCE_MS = 350;

const Students = ({
  studentsData,
  meta,
  isLoading,
  isFetching,
  query,
  onQueryChange,
  refetch,
}: StudentsProps) => {
  const router = useRouter();
  const [search, setSearch] = useState(query.searchTerm || "");
  const [payingStudent, setPayingStudent] = useState<TStudent | null>(null);

  // Search-as-you-type: debounce the search input so we only fire the query
  // ~350ms after the user stops typing (or immediately if they hit Enter).
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = search.trim() || undefined;
      if ((query.searchTerm || undefined) === next) return;
      onQueryChange({ ...query, searchTerm: next, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    onQueryChange({ ...query, searchTerm: undefined, page: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total students` : "Loading..."}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/students/new">
            <Plus className="h-4 w-4" /> Admit Student
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, student ID, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Fire immediately on Enter.
                  onQueryChange({
                    ...query,
                    searchTerm: search.trim() || undefined,
                    page: 1,
                  });
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
        </div>
        <Select
          value={query.hscBatch || "_all"}
          onValueChange={(v) =>
            onQueryChange({
              ...query,
              hscBatch: v === "_all" ? undefined : (v as TStudentQuery["hscBatch"]),
              page: 1,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All batches</SelectItem>
            {hscBatches.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Day (e.g. Saturday)"
          value={query.batchDay || ""}
          onChange={(e) =>
            onQueryChange({ ...query, batchDay: e.target.value || undefined, page: 1 })
          }
        />
        <Input
          placeholder="Time (e.g. 4:00 PM)"
          value={query.batchTime || ""}
          onChange={(e) =>
            onQueryChange({ ...query, batchTime: e.target.value || undefined, page: 1 })
          }
        />
      </div>

      <StudentsTable
        students={studentsData}
        isLoading={isLoading}
        isFetching={isFetching}
        onView={(s) => router.push(`/dashboard/students/${s.id}`)}
        onEdit={(s) => router.push(`/dashboard/students/${s.id}/edit`)}
        onPay={(s) => setPayingStudent(s)}
      />

      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => onQueryChange({ ...query, page: (meta.page || 1) - 1 })}
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
            onClick={() => onQueryChange({ ...query, page: (meta.page || 1) + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {payingStudent && (
        <RecordPaymentModal
          open={!!payingStudent}
          onClose={() => setPayingStudent(null)}
          student={payingStudent}
          onSuccess={() => {
            setPayingStudent(null);
            toast.success("Payment recorded");
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default Students;