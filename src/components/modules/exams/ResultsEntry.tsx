"use client";
import { useMemo, useState } from "react";
import { FileUp, Loader2, Save, Clock } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useUpsertResultMutation,
  useBulkResultsMutation,
} from "@/redux/features/exam/exam";
import type {
  TExamDetail,
  TRosterEntry,
  TStudentBatchLite,
} from "@/types/exam";

type Props = {
  exam: TExamDetail;
  refetch: () => void;
};

type RowDraft = {
  studentId: string;
  isAbsent: boolean;
  sections: {
    sectionId: string;
    correctAnswers: string; // raw string for input control
    obtainedMarks: string;
  }[];
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

const ResultsEntry = ({ exam, refetch }: Props) => {
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");

  const [upsertResult, { isLoading: saving }] = useUpsertResultMutation();
  const [bulkResults, { isLoading: bulkSaving }] = useBulkResultsMutation();

  // Same gate as the Examinees tab — no marks entry before the exam date.
  const isBeforeExam = useMemo(
    () => dayjs(exam.examDate).startOf("day").isAfter(dayjs().startOf("day")),
    [exam.examDate],
  );

  const sectionHeaders = exam.sections;

  const dirtyStudentIds = useMemo(
    () =>
      Object.entries(drafts)
        .filter(([_, d]) => {
          if (d.isAbsent) return false;
          // dirty if any section field is non-empty
          return d.sections.some(
            (s) => s.correctAnswers !== "" || s.obtainedMarks !== "",
          );
        })
        .map(([id]) => id),
    [drafts],
  );

  const setDraftSection = (
    studentId: string,
    sectionId: string,
    patch: Partial<{ correctAnswers: string; obtainedMarks: string }>,
  ) => {
    setDrafts((prev) => {
      const existing: RowDraft =
        prev[studentId] ??
        ({
          studentId,
          isAbsent: false,
          sections: sectionHeaders.map((s) => ({
            sectionId: s.id,
            correctAnswers: "",
            obtainedMarks: "",
          })),
        } as RowDraft);
      return {
        ...prev,
        [studentId]: {
          ...existing,
          sections: existing.sections.map((s) =>
            s.sectionId === sectionId ? { ...s, ...patch } : s,
          ),
        },
      };
    });
  };

  // Initialise drafts from the current roster (so partial input is shown on
  // re-mount of the tab).
  const initDrafts = (entry: TRosterEntry): RowDraft => ({
    studentId: entry.studentId,
    isAbsent: entry.isAbsent,
    sections: sectionHeaders.map((sh) => {
      const existing = entry.sections.find((s) => s.sectionId === sh.id);
      return {
        sectionId: sh.id,
        correctAnswers:
          existing?.correctAnswers != null
            ? String(existing.correctAnswers)
            : "",
        obtainedMarks: String(existing?.obtainedMarks ?? ""),
      };
    }),
  });

  const saveAll = async () => {
    if (dirtyStudentIds.length === 0) {
      toast.info("Nothing to save");
      return;
    }
    const results = dirtyStudentIds.map((sid) => {
      const d = drafts[sid] ?? initDrafts(
        exam.roster.find((r) => r.studentId === sid)!,
      );
      return {
        studentId: sid,
        isAbsent: d.isAbsent,
        sections: d.sections.map((s) => ({
          sectionId: s.sectionId,
          obtainedMarks: Number(s.obtainedMarks || 0),
          ...(s.correctAnswers !== ""
            ? { correctAnswers: Number(s.correctAnswers) }
            : {}),
        })),
      };
    });
    try {
      const res = await bulkResults({ id: exam.id, results }).unwrap();
      const failed = res.data?.failed ?? [];
      const succeeded = res.data?.succeeded ?? [];
      if (failed.length === 0) {
        toast.success(`${succeeded.length} result(s) saved`);
      } else {
        toast.warning(`${succeeded.length} saved, ${failed.length} failed`);
      }
      setDrafts({});
      refetch();
    } catch (e) {
      const msg =
        (e as { data?: { message?: string } })?.data?.message ?? "Save failed";
      toast.error(msg);
    }
  };

  const saveOne = async (entry: TRosterEntry) => {
    const draft = drafts[entry.studentId] ?? initDrafts(entry);
    try {
      await upsertResult({
        id: exam.id,
        studentId: entry.studentId,
        isAbsent: draft.isAbsent,
        sections: draft.sections.map((s) => ({
          sectionId: s.sectionId,
          obtainedMarks: Number(s.obtainedMarks || 0),
          ...(s.correctAnswers !== ""
            ? { correctAnswers: Number(s.correctAnswers) }
            : {}),
        })),
      }).unwrap();
      toast.success(`${entry.studentName} saved`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[entry.studentId];
        return next;
      });
      refetch();
    } catch (e) {
      const msg =
        (e as { data?: { message?: string } })?.data?.message ?? "Save failed";
      toast.error(msg);
    }
  };

  const handleBulkPaste = async () => {
    // Expected CSV header: code, [section1], [section2], ...
    // For MCQ columns we accept either a "X/Y" pattern or a single number;
    // for Written columns a single number is the obtained marks.
    const lines = bulkCsv
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("Paste some rows first");
      return;
    }
    const header = lines[0].split(",").map((c) => c.trim().toLowerCase());
    const codeIdx = header.findIndex((h) => h === "code" || h === "studentid");
    if (codeIdx < 0) {
      toast.error("Header must include 'code' column");
      return;
    }
    const sectionColIdx = header
      .map((h, i) => ({ h, i }))
      .filter(({ i }) => i !== codeIdx)
      .map(({ i }) => i);
    const sectionNames = sectionColIdx.map((i) => header[i]);
    const sectionMap = new Map<string, typeof exam.sections[number]>();
    for (const name of sectionNames) {
      const found = exam.sections.find(
        (s) => s.name.toLowerCase() === name,
      );
      if (found) sectionMap.set(name, found);
    }
    if (sectionMap.size === 0) {
      toast.error(
        `None of the CSV columns matched a section. Section names: ${exam.sections.map((s) => s.name).join(", ")}`,
      );
      return;
    }

    const rosterByCode = new Map(
      exam.roster.map((r) => [r.studentCode, r]),
    );
    const results: {
      studentId: string;
      sections: {
        sectionId: string;
        obtainedMarks: number;
        correctAnswers?: number;
      }[];
    }[] = [];
    const notFound: string[] = [];
    for (const line of lines.slice(1)) {
      const cells = line.split(",").map((c) => c.trim());
      const code = cells[codeIdx];
      const r = rosterByCode.get(code);
      if (!r) {
        notFound.push(code);
        continue;
      }
      const sectionPayload: {
        sectionId: string;
        obtainedMarks: number;
        correctAnswers?: number;
      }[] = [];
      sectionColIdx.forEach((colIdx, idx) => {
        const name = sectionNames[idx];
        const section = sectionMap.get(name);
        if (!section) return;
        const raw = cells[colIdx] ?? "";
        // For MCQ, accept "X/Y" → correctAnswers = X (out of Y)
        if (section.type === "MCQ") {
          const slash = raw.split("/");
          if (slash.length === 2) {
            const correct = Number(slash[0]);
            sectionPayload.push({
              sectionId: section.id,
              obtainedMarks: Math.min(correct, section.totalQuestions) * section.marksPerQuestion,
              correctAnswers: Math.min(correct, section.totalQuestions),
            });
            return;
          }
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        sectionPayload.push({
          sectionId: section.id,
          obtainedMarks: Math.min(Math.max(0, Math.round(n)), section.totalMarks),
        });
      });
      results.push({ studentId: r.studentId, sections: sectionPayload });
    }

    try {
      const res = await bulkResults({ id: exam.id, results }).unwrap();
      const succeeded = res.data?.succeeded.length ?? 0;
      const failed = res.data?.failed.length ?? 0;
      toast.success(
        `Bulk paste: ${succeeded} saved${failed ? `, ${failed} failed` : ""}${notFound.length ? `, ${notFound.length} unknown codes` : ""}`,
      );
      setBulkOpen(false);
      setBulkCsv("");
      refetch();
    } catch (e) {
      const msg =
        (e as { data?: { message?: string } })?.data?.message ?? "Bulk save failed";
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
                Marks can be entered starting from{" "}
                {dayjs(exam.examDate).format("DD MMM YYYY")}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Marks entry</CardTitle>
            <CardDescription>
              {isBeforeExam
                ? "Marks entry is disabled until the exam date."
                : "Type the obtained marks per section. MCQ columns accept either a single number or \"correct/total\" (e.g. 18/30)."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              disabled={isBeforeExam}
            >
              <FileUp className="h-4 w-4" /> Bulk paste
            </Button>
            <Button
              size="sm"
              onClick={saveAll}
              disabled={
                isBeforeExam ||
                saving ||
                bulkSaving ||
                dirtyStudentIds.length === 0
              }
            >
              {(saving || bulkSaving) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <Save className="h-4 w-4" /> Save all ({dirtyStudentIds.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Batch</TableHead>
                {sectionHeaders.map((s) => (
                  <TableHead key={s.id} className="text-center">
                    {s.name}
                    <p className="text-[10px] text-muted-foreground">
                      {s.type} · {s.totalMarks}m
                    </p>
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exam.roster.map((entry) => {
                const draft =
                  drafts[entry.studentId] ?? initDrafts(entry);
                const total = draft.sections.reduce(
                  (acc, s) => acc + Number(s.obtainedMarks || 0),
                  0,
                );
                return (
                  <TableRow key={entry.id}>
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
                      {entry.isAbsent && (
                        <Badge variant="destructive" className="mt-1">
                          ABSENT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.studentMobile || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatBatches(entry.studentBatches)}
                    </TableCell>
                    {sectionHeaders.map((sh) => {
                      const secDraft = draft.sections.find(
                        (s) => s.sectionId === sh.id,
                      );
                      return (
                        <TableCell key={sh.id} className="text-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            disabled={entry.isAbsent || isBeforeExam}
                            value={secDraft?.obtainedMarks ?? ""}
                            onChange={(e) =>
                              setDraftSection(entry.studentId, sh.id, {
                                obtainedMarks: e.target.value,
                              })
                            }
                            className="w-20 mx-auto text-center"
                            placeholder={sh.type === "MCQ" ? "X/Y" : "0"}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium">
                      {entry.isAbsent ? "—" : total}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={entry.isAbsent || isBeforeExam}
                        onClick={() => saveOne(entry)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk paste marks</DialogTitle>
            <DialogDescription>
              CSV with header row. First column = student code. Subsequent
              columns = section names matching exactly.
              <br />
              Example: <code className="bg-muted px-1">code,MCQ,Srijonsil,BUET</code>
              <br />
              For MCQ columns you may use "18/30" to set correct=18 out of 30.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>CSV</Label>
            <Textarea
              rows={8}
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
              placeholder={"code,MCQ,Srijonsil,BUET\nBD00042,28/30,18,8\nBD00043,30/30,20,10"}
            />
            <p className="text-xs text-muted-foreground">
              Section names: {exam.sections.map((s) => s.name).join(", ")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPaste}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultsEntry;