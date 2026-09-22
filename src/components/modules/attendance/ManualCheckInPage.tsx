"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  ScanLine,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Wallet,
  CalendarCheck2,
  ArrowLeftRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCheckInMutation,
  useGetTodayAttendanceQuery,
  useManualCheckInMutation,
} from "@/redux/features/attendance/attendance";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import { TStudent } from "@/types/student";

/**
 * Result of one scanner / manual check-in. Mirrors the backend's
 * `checkInStudentToDB` / `manualCheckInToDB` return shape — the
 * `dueAmount` is what powers the "Fully paid" / "Has due" badge.
 */
type TCheckInResult = {
  studentId: string;
  name: string;
  nickname?: string | null;
  attendanceId: string;
  date: string;
  // When non-null, the row was recorded for the student's dedicated
  // class day while the scan happened on a peer-batch day. ISO
  // yyyy-mm-dd strings.
  swapFromDate?: string | null;
  checkInAt: string;
  method: string;
  isFirstCheckIn: boolean;
  courseNames: string[];
  dueAmount: number;
  message: string;
};

/**
 * Local entry in the "today's scans" feed. Kept in component state so
 * each new scan prepends immediately without waiting for the next
 * `useGetTodayAttendanceQuery` refetch — the feed still mirrors the
 * server after the refetch lands.
 */
type TFeedEntry = {
  studentId: string;
  name: string;
  studentCode: string;
  dueAmount: number;
  courseNames: string[];
  isFirstCheckIn: boolean;
  method: string;
  at: string;
  // ISO yyyy-mm-dd. Set when the backend returned a swap for this row.
  swapFromDate?: string | null;
};

const formatTaka = (n: number) => `৳${n.toLocaleString()}`;

const ManualCheckInPage = () => {
  const router = useRouter();

  // Search-driven manual pick — the existing flow.
  const [search, setSearch] = useState("");
  const { data, isFetching } = useGetAllStudentsQuery(
    { searchTerm: search, limit: 10, page: 1 },
    { skip: !search },
  );

  // Scanner state. `scannerInput` is what the user types / what the
  // barcode scanner's HID-keyboard emulation pumps in. We auto-focus
  // it on mount + after every successful scan so the operator never
  // has to reach for the mouse.
  const [scannerInput, setScannerInput] = useState("");
  const scannerRef = useRef<HTMLInputElement | null>(null);

  // The most recent check-in result — rendered as a big "last scan"
  // card right under the scanner input.
  const [lastScan, setLastScan] = useState<TCheckInResult | null>(null);

  // Live feed of today's scans (in-memory, prepended on each success).
  const [feed, setFeed] = useState<TFeedEntry[]>([]);

  const [checkIn, { isLoading: isScanning }] = useCheckInMutation();
  const [manualCheckIn, { isLoading: isManualLoading }] =
    useManualCheckInMutation();
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // Cross-check the feed against the server's view so we're not lying
  // if the page reloads. The feed starts empty and gets populated only
  // from local successes — this query is the source of truth for
  // counts but we don't double-render.
  const { data: todayData } = useGetTodayAttendanceQuery({
    page: 1,
    limit: 200,
  });

  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

  // Reseed the feed from the server response whenever it changes —
  // this matters when the page first loads (the operator wants to see
  // who's already checked in before scanning).
  useEffect(() => {
    if (!todayData?.data) return;
    setFeed(
      todayData.data.map((a) => ({
        studentId: a.student.id,
        name: a.student.user.name,
        studentCode: a.student.user.studentId,
        dueAmount: 0, // not exposed in /today; UI shows "—" for backfill
        courseNames: [],
        isFirstCheckIn: false,
        method: a.method,
        at: a.checkInAt,
      })),
    );
  }, [todayData]);

  /**
   * Audio chime — short oscillator blip. We synthesise it on the
   * fly so we don't need an asset file. Different frequencies for
   * success vs error so the operator can hear without looking.
   */
  const playTone = (kind: "ok" | "err") => {
    try {
      const ctx = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = kind === "ok" ? 880 : 220;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch {
      // Audio is best-effort — never block the scan on a sound failure.
    }
  };

  const handleScanSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = scannerInput.trim();
    if (!code) return;
    try {
      const res = await checkIn({ studentId: code }).unwrap();
      if (res.success && res.data) {
        const d = res.data;
        const entry: TCheckInResult = {
          studentId: d.student.studentId,
          name: d.student.name,
          nickname: d.student.nickname,
          attendanceId: d.attendanceId,
          date: d.date,
          swapFromDate: d.swapFromDate ?? null,
          checkInAt: d.checkInAt,
          method: d.method,
          isFirstCheckIn: d.isFirstCheckIn,
          courseNames: d.courseNames,
          dueAmount: d.dueAmount,
          message: d.message,
        };
        setLastScan(entry);
        setFeed((prev) => [
          {
            studentId: entry.studentId,
            name: entry.name,
            studentCode: entry.studentId,
            dueAmount: entry.dueAmount,
            courseNames: entry.courseNames,
            isFirstCheckIn: entry.isFirstCheckIn,
            method: entry.method,
            at: entry.checkInAt,
            swapFromDate: entry.swapFromDate ?? null,
          },
          ...prev.filter((p) => p.studentCode !== entry.studentId),
        ]);
        playTone("ok");
        // Toast surfaces the swap when applicable so the operator
        // immediately sees whether the row was recorded for today or
        // for an adjacent dedicated day.
        const isSwap = Boolean(entry.swapFromDate);
        toast.success(
          isSwap
            ? `${entry.name} · make-up for ${dayjs(entry.date).format("ddd, MMM D")}`
            : entry.dueAmount > 0
              ? `${entry.name} · due ${formatTaka(entry.dueAmount)}`
              : `${entry.name} · fully paid`,
        );
      }
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Scan failed";
      toast.error(message);
      playTone("err");
    } finally {
      setScannerInput("");
      scannerRef.current?.focus();
    }
  };

  const handleManualCheckIn = async (student: TStudent) => {
    setCheckingId(student.id);
    try {
      const res = await manualCheckIn({ studentId: student.id }).unwrap();
      if (res.success && res.data) {
        const d = res.data;
        setFeed((prev) => [
          {
            studentId: d.student.studentId,
            name: d.student.name,
            studentCode: d.student.studentId,
            dueAmount: d.dueAmount,
            courseNames: d.courseNames,
            isFirstCheckIn: d.isFirstCheckIn,
            method: d.method,
            at: d.checkInAt,
            swapFromDate: d.swapFromDate ?? null,
          },
          ...prev.filter(
            (p) => p.studentCode !== d.student.studentId,
          ),
        ]);
        // Also surface the swap in the headline card so the admin
        // sees the make-up row the same way a barcode scan would.
        setLastScan({
          studentId: d.student.studentId,
          name: d.student.name,
          nickname: d.student.nickname,
          attendanceId: d.attendanceId,
          date: d.date,
          swapFromDate: d.swapFromDate ?? null,
          checkInAt: d.checkInAt,
          method: d.method,
          isFirstCheckIn: d.isFirstCheckIn,
          courseNames: d.courseNames,
          dueAmount: d.dueAmount,
          message: d.message,
        });
        toast.success(d.message);
        playTone("ok");
      }
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to check in";
      toast.error(message);
      playTone("err");
    } finally {
      setCheckingId(null);
    }
  };

  const todayCount = feed.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manual Check-In</h2>
          <p className="text-sm text-muted-foreground">
            Scan a student barcode or search by name / Student ID to mark
            attendance.
          </p>
        </div>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex items-center gap-2">
          <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{todayCount}</span>
          <span className="text-muted-foreground">checked in today</span>
        </div>
      </div>

      {/* Scanner card — receives focus on mount + after every scan. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" />
            Scan barcode
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Most USB barcode scanners act as a keyboard — just point and
            shoot. The scanner input receives focus automatically after each
            successful scan.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleScanSubmit}
            className="flex gap-2"
          >
            <Input
              ref={scannerRef}
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              placeholder="Scan or type Student ID and press Enter"
              autoComplete="off"
              className="font-mono text-lg h-12"
              disabled={isScanning}
            />
            <Button
              type="submit"
              disabled={isScanning || !scannerInput.trim()}
              className="h-12 px-6"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Check in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Last-scan card — the headline feedback after each successful
          scan. Shows payment status prominently. Swap rows take amber
          priority over due (a make-up is the more interesting event). */}
      {lastScan && (
        <Card
          className={
            lastScan.swapFromDate
              ? "border-amber-400 bg-amber-50/40"
              : lastScan.dueAmount > 0
                ? "border-amber-400 bg-amber-50/40"
                : "border-emerald-400 bg-emerald-50/40"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {lastScan.swapFromDate ? (
                    <ArrowLeftRight className="h-5 w-5 text-amber-600" />
                  ) : lastScan.dueAmount > 0 ? (
                    <XCircle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <p className="text-lg font-semibold">
                    {lastScan.name}
                    {lastScan.nickname ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({lastScan.nickname})
                      </span>
                    ) : null}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {lastScan.studentId}
                  {lastScan.courseNames.length > 0
                    ? ` · ${lastScan.courseNames.join(", ")}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dayjs(lastScan.checkInAt).format(
                    "ddd, MMM D, YYYY · h:mm A",
                  )}{" "}
                  <span className="opacity-70">({lastScan.method})</span>
                </p>
                {lastScan.swapFromDate && (
                  <p className="text-xs text-amber-700 mt-1 font-medium">
                    Recorded for {dayjs(lastScan.date).format("ddd, MMM D")}{" "}
                    · scanned {dayjs(lastScan.swapFromDate).format("ddd")}
                  </p>
                )}
              </div>
              <div className="text-right">
                {lastScan.swapFromDate ? (
                  <Badge variant="warning" className="text-sm">
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    Make-up swap
                  </Badge>
                ) : lastScan.dueAmount > 0 ? (
                  <>
                    <Badge variant="warning" className="text-sm">
                      <Wallet className="h-3 w-3 mr-1" />
                      Due {formatTaka(lastScan.dueAmount)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      across {lastScan.courseNames.length} course
                      {lastScan.courseNames.length === 1 ? "" : "s"}
                    </p>
                  </>
                ) : (
                  <Badge variant="success" className="text-sm">
                    Fully paid
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {lastScan.isFirstCheckIn
                    ? lastScan.swapFromDate
                      ? "First make-up recorded"
                      : "First check-in today"
                    : "Already checked in"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live feed — most recent first. Operator can verify visually
          that a scan registered without leaving the page. */}
      {feed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Today&apos;s scans ({feed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-100 overflow-y-auto">
            {feed.map((f, i) => (
              <div
                key={`${f.studentCode}-${f.at}-${i}`}
                className={
                  f.swapFromDate
                    ? "flex items-center justify-between rounded-md border border-amber-300 bg-amber-50/40 px-3 py-2"
                    : "flex items-center justify-between rounded-md border bg-card px-3 py-2"
                }
              >
                <div>
                  <p className="font-medium text-sm">
                    {f.name}
                    {f.swapFromDate && (
                      <Badge
                        variant="warning"
                        className="text-[10px] ml-2 align-middle"
                      >
                        <RefreshCw className="h-2.5 w-2.5 mr-1" />
                        make-up
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {f.studentCode}
                    {f.courseNames.length > 0
                      ? ` · ${f.courseNames.join(", ")}`
                      : ""}
                  </p>
                  {f.swapFromDate && (
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                      Recorded for {dayjs(f.at).format("ddd, MMM D")} ·
                      scanned {dayjs(f.swapFromDate).format("ddd")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {f.dueAmount > 0 ? (
                    <Badge variant="warning" className="text-[10px]">
                      Due {formatTaka(f.dueAmount)}
                    </Badge>
                  ) : (
                    f.courseNames.length > 0 && (
                      <Badge variant="success" className="text-[10px]">
                        Paid
                      </Badge>
                    )
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    {dayjs(f.at).format("h:mm A")}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing manual search flow — unchanged. */}
      <Card>
        <CardHeader>
          <CardTitle>Find Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isFetching && search && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      <div className="space-y-2">
        {data?.data?.map((student) => (
          <Card key={student.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{student.user.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {student.user.studentId} • {student.mobile}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/students/${student.id}`)
                  }
                >
                  View
                </Button>
                <Button
                  size="sm"
                  disabled={checkingId === student.id || isManualLoading}
                  onClick={() => handleManualCheckIn(student)}
                >
                  {checkingId === student.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Check In"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {search && data?.data?.length === 0 && !isFetching && (
          <p className="text-sm text-muted-foreground">No students found.</p>
        )}
      </div>
    </div>
  );
};

export default ManualCheckInPage;
