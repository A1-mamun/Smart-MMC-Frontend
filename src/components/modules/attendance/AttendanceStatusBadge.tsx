import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

// Mirror of the backend `AttendanceStatus` enum (Prisma). Kept in
// sync by hand — there's no codegen pipeline between Prisma's
// generated types and this frontend; the trade-off is one line of
// duplication vs. wiring up an OpenAPI codegen.
//
// Make-up attendance is no longer supported (see
// `attendance.service.ts`), so the union is just PRESENT | ABSENT.
//
// `as const` on the array so TypeScript narrows to the union type
// of the enum members.
export type TAttendanceStatus = "PRESENT" | "ABSENT";

const STATUS_META: Record<
  TAttendanceStatus,
  { label: string; variant: "default" | "destructive"; Icon: typeof CheckCircle2 }
> = {
  PRESENT: {
    label: "Present",
    variant: "default",
    Icon: CheckCircle2,
  },
  ABSENT: {
    label: "Absent",
    variant: "destructive",
    Icon: XCircle,
  },
};

interface AttendanceStatusBadgeProps {
  status: TAttendanceStatus | string | undefined;
}

/**
 * Render a per-row status badge. Falls back to "Present" when the
 * field is missing so legacy rows created before the column existed
 * don't render as an empty badge (the migration backfilled to
 * PRESENT, but defensive code here protects against pre-migration
 * snapshots / stale caches).
 */
export const AttendanceStatusBadge = ({ status }: AttendanceStatusBadgeProps) => {
  const key: TAttendanceStatus =
    status && status in STATUS_META ? (status as TAttendanceStatus) : "PRESENT";
  const meta = STATUS_META[key];
  const Icon = meta.Icon;
  return (
    <Badge variant={meta.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
};