"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScanLine, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useSetAttendanceMutation,
  useBulkAttendanceByStudentIdMutation,
} from "@/redux/features/exam/exam";
import type { TExamDetail, TRosterEntry, TStudentBatchLite } from "@/types/exam";

type Props = {
  exam: TExamDetail;
  refetch: () => void;
};

// Map HscBatch enum ("BATCH_25" → "HSC'25") for compact display.
const formatHscBatch = (hsc?: string | null) => {
  if (!hsc) return null;
  const m = hsc.match(/BATCH_(\d+)/);
  return m ? `HSC'${m[1].slice(-2)}` : hsc;
};

// Render a compact batch label like "Sat-Mon · 4:00 PM · HSC'25". Falls back
// gracefully if any field is missing.
const formatBatches = (batches?: TStudentBatchLite[]) => {
  if (!batches || batches.length === 0) return "—";
  return batches
    .map((b) => {
      const parts = [b.batchDay, b.batchTime, formatHscBatch(b.hscBatch)].filter(
        Boolean,
      );
      return parts.join(" · ");
    })
    .join(" | ");
};

const RosterAttendance = ({ exam, refetch }: Props) => {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState("");
  const [lastScan, setLastScan] = useState<
    | { kind: "ok"; code: string; name?: string }
    | { kind: "unknown"; code: string }
    | { kind: "skipped"; code: string }
    | null
  >(null);

  const [setAttendance] = useSetAttendanceMutation();
  const [bulkAttendance] = useBulkAttendanceByStudentIdMutation();

  // The attendance UI is meaningless before the exam date — the student
  // hasn't taken the exam yet, so we shouldn't let the admin mark them
  // present/absent. We treat "exam not taken yet" as any day strictly
  // before `exam.examDate` (start-of-day comparison). Once that day
  // arrives (or passes), the full UI is enabled.
  const isBeforeExam = useMemo(
    () => dayjs(exam.examDate).startOf("day").isAfter(dayjs().startOf("day")),
    [exam.examDate],
  );

  // Auto-focus the barcode input on mount so USB scanners (which type into
  // the focused field + emit Enter) work without admin interaction.
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;
    setScanValue("");
    try {
      const res = await bulkAttendance({
        id: exam.id,
        studentIds: [code],
      }).unwrap();
      if (res.data?.marked?.includes(code)) {
        const found = exam.roster.find((r) => r.studentCode === code);
        setLastScan({ kind: "ok", code, name: found?.studentName });
        toast.success(`${found?.studentName ?? code} marked PRESENT`);
        refetch();
        setTimeout(() => barcodeRef.current?.focus(), 50);
      } else if (res.data?.unknown?.includes(code)) {
        setLastScan({ kind: "unknown", code });
        toast.warning(`Unknown student code: ${code}`);
      } else if (res.data?.skipped?.includes(code)) {
        setLastScan({ kind: "skipped", code });
        toast.warning(`${code} is not in this exam's examinee list`);
      } else {
        // No-op (already present)
        setLastScan({ kind: "ok", code });
      }
    } catch (err) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ?? "Scan failed";
      toast.error(msg);
    }
  };

  const toggleAbsent = async (entry: TRosterEntry, isAbsent: boolean) => {
    if (isAbsent && entry.obtainedMarks > 0) {
      const ok = window.confirm(
        `${entry.studentName} has ${entry.obtainedMarks} marks entered. Marking absent will ZERO these marks. Continue?`,
      );
      if (!ok) return;
    }
    try {
      await setAttendance({
        id: exam.id,
        studentId: entry.studentId,
        isAbsent,
      }).unwrap();
      toast.success(
        isAbsent ? `${entry.studentName} marked ABSENT` : `${entry.studentName} marked PRESENT`,
      );
      refetch();
    } catch (err) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ?? "Failed";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      {isBeforeExam && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">The exam is not taken yet.</p>
              <p className="text-xs text-muted-foreground">
                Attendance can be marked starting from{" "}
                {dayjs(exam.examDate).format("DD MMM YYYY")}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" />
            Barcode scanner
          </CardTitle>
          <CardDescription>
            Scan a student card or paste a student code (e.g. BD00042) and press Enter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-2">
            <Input
              ref={barcodeRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan or type student code..."
              autoFocus
              className="font-mono"
              disabled={isBeforeExam}
            />
            <Button type="submit" variant="outline" disabled={isBeforeExam}>
              Mark present
            </Button>
          </form>
          {lastScan && (
            <div className="mt-2 text-sm">
              {lastScan.kind === "ok" && (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {lastScan.name ?? lastScan.code} marked PRESENT
                </span>
              )}
              {lastScan.kind === "unknown" && (
                <span className="inline-flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  Unknown code: {lastScan.code}
                </span>
              )}
              {lastScan.kind === "skipped" && (
                <span className="inline-flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  {lastScan.code} is not in this exam's examinee list
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Examinees ({exam.roster.length})
          </CardTitle>
          <CardDescription>
            {isBeforeExam
              ? "The roster is read-only until the exam date."
              : "Toggle off to mark a student ABSENT. Absent students cannot have results entered."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {isBeforeExam ? (
                  <TableHead className="w-32">Status</TableHead>
                ) : (
                  <TableHead className="w-24">Present</TableHead>
                )}
                <TableHead>Student</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Marks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exam.roster.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {isBeforeExam ? (
                      <Badge variant="outline">Not taken</Badge>
                    ) : (
                      <Switch
                        checked={!entry.isAbsent}
                        onCheckedChange={(present) =>
                          toggleAbsent(entry, !present)
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{entry.studentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {entry.studentCode}
                    </p>
                    {entry.studentCollege && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.studentCollege}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.studentMobile || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatBatches(entry.studentBatches)}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.isAbsent ? "—" : entry.obtainedMarks}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RosterAttendance;