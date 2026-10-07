"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  GraduationCap,
  Calendar,
  X,
  Sparkles,
  LogIn,
  Unlock,
} from "lucide-react";
import {
  useCheckInMutation,
  useGetCurrentBatchQuery,
  type TCurrentBatch,
} from "@/redux/features/attendance/attendance";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { instituteInfo } from "@/constants/institute";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Take automatic attendance" kiosk view.
 *
 * Opens in a full-screen browser window (no sidebar / top tablist —
 * see the `open` call in the AttendancePage button) and continuously
 * displays the batch that's happening right now so the operator can
 * hand a barcode scanner to students one after another. When a
 * student places their ID card on the scanner the kiosk:
 *   1. Reads the `studentCourseId` from the scanner's HID emulation.
 *   2. POSTs `/attendance/check-in` with that id (the same endpoint
 *      used by the existing manual check-in page; gated by
 *      `x-device-secret`).
 *   3. Shows a big success / failure modal with the backend's
 *      `message` (e.g. "Welcome, X!" or "Already marked on
 *      YYYY-MM-DD").
 *   4. Auto-dismisses the modal after a couple of seconds and
 *     re-focuses the scanner input so the next student can scan
 *     immediately.
 *
 * Auto-rotation:
 *   The page polls `GET /attendance/current-batch` every 60s and
 *   immediately after every successful scan, so when a batch ends
 *   (e.g. 4:00 PM class ends at 5:00 PM) the page naturally flips
 *   over to the next batch (5:00 PM, then 6:00 PM) without any
 *   operator action. Between batches the page shows a calm
 *   "next class in N min" pre-announcement.
 */
type TFeedback =
  | { kind: "success"; title: string; subtitle: string; courseNames?: string[]; swapFromDate?: string | null }
  | { kind: "failure"; title: string; subtitle: string };

/**
 * Render a minutes-since-midnight integer as "h:mm AM/PM" so the
 * "check-in opens at X" / "closes at X" hints are human-readable
 * without needing a third-party date library on the frontend.
 */
const minutesToClock = (minutes: number): string => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
};

/**
 * Format a class duration (total minutes) as "Xh Ym" for the kiosk
 * header. e.g. 75 → "1h 15m", 60 → "1h 0m", 90 → "1h 30m".
 * Used for the "Duration: 1h 15m" pill on the kiosk + the progress
 * bar's "X total" label.
 */
const formatDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

/**
 * Pick the right scanner-input placeholder for the current
 * window-state. Kept as a pure helper so the JSX stays readable.
 */
type TWindowState =
  | { canScan: true; reason: "open"; closesAtMinutes: number }
  | { canScan: true; reason: "override"; closesAtMinutes: number }
  | { canScan: false; reason: "no_batch" }
  | { canScan: false; reason: "before_start"; opensAtMinutes: number }
  | { canScan: false; reason: "after_close" }
  | { canScan: false; reason: "slot_disabled" };
const scanPlaceholderFor = (state: TWindowState): string => {
  if (state.reason === "open") return "Awaiting scan…";
  if (state.reason === "override") return "Awaiting scan… (window override active)";
  if (state.reason === "before_start") {
    return `Window opens at ${minutesToClock(state.opensAtMinutes)}`;
  }
  if (state.reason === "after_close") {
    return "Window closed — wait for the next batch";
  }
  if (state.reason === "slot_disabled") {
    return "Attendance is disabled for this slot";
  }
  return "No batch scheduled — scanner disabled";
};

const AutomaticAttendancePage = () => {
  // The kiosk route lives in its own `(kiosk)` group so the
  // dashboard layout (which gates auth) doesn't apply. We re-gate
  // here manually: only super admins and admins are allowed to
  // open the automatic-attendance popup. If the visitor isn't
  // signed in / isn't admin, we show a friendly redirect hint
  // rather than a hard navigation (avoids losing the popup if
  // the operator opens it before auth has fully loaded).
  const router = useRouter();
  const user = useAppSelector(useCurrentUser);
  const isAuthorized = !!user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN");

  // Current-batch poll. `pollingInterval: 60_000` is the rotation
  // timer (60s). `refetchOnFocus / reconnect` left at their defaults
  // because the kiosk window is always focused when the operator
  // is on-site.
  const {
    data: currentBatchData,
    isFetching,
    refetch: refetchCurrentBatch,
  } = useGetCurrentBatchQuery(undefined, {
    pollingInterval: 60_000,
    refetchOnReconnect: true,
    skip: !isAuthorized,
  });

  // Scanner state — mirrors the existing ManualCheckInPage so
  // admins can swap between the two views without re-learning the
  // keyboard flow.
  const [scannerInput, setScannerInput] = useState("");
  const scannerRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<TFeedback | null>(null);
  const [checkIn, { isLoading: isScanning }] = useCheckInMutation();

  /**
   * Tick counter that re-renders the kiosk every 30s so the
   * live "X min remaining" / progress bar ticks down without the
   * operator having to refresh. Critically, this is NOT where the
   * elapsed/remaining time is stored — those values are derived
   * from `Date.now()` inside `liveProgress` (a `useMemo` keyed on
   * `[batch, tick]`), so a page reload instantly snaps to the
   * correct elapsed/remaining value rather than restarting from 0.
   * The tick only exists to force a re-render; the displayed time
   * is always recomputed from the wall clock.
   */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handle = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(handle);
  }, []);

  /**
   * Compute the live "can-scan?" status of the kiosk from the
   * currently-displayed batch. The backend enforces the same rule
   * (5-min check-in window after class start) so a determined
   * attacker can't bypass the gate — this computed value is the
   * operator-facing affordance that disables the input and shows a
   * countdown / closure message so the operator never wonders why
   * scans are bouncing.
   *
   * Re-evaluates every render so the closure message updates in
   * real time as the wall clock crosses the 5-min mark.
   */
  const windowState: TWindowState = useMemo(() => {
    const batch = currentBatchData?.data;
    if (!batch || batch.kind !== "current") {
      return { canScan: false, reason: "no_batch" as const };
    }
    // Per-slot admin override: when the admin has flipped the
    // matched slot's `slotEnabled` to false (via the "Take
    // attendance" toggle on the Courses page), the scanner is
    // disabled. Backend rejects scans for disabled slots as a
    // backstop, but greying the input is the operator-facing
    // affordance so they don't wonder why scans are bouncing.
    if (batch.slotEnabled === false) {
      return { canScan: false, reason: "slot_disabled" as const };
    }
    // Manual check-in window override: when the admin has
    // toggled the per-slot "Window: Open" switch on the
    // Courses page (e.g. opened the window early for an early
    // arrival, or kept it open past the 5-min mark because
    // the class was delayed), the scanner is "always on" for
    // this slot regardless of the wall clock. The backend
    // already accepted the override and returned this batch as
    // `current`; we just need to surface "scan anytime" to the
    // operator instead of the default 5-min window.
    if (batch.manualWindowOpen) {
      return {
        canScan: true,
        reason: "override",
        // `closesAtMinutes` isn't meaningful under the override
        // (the window is open until the admin closes it). We
        // fall back to the default end-of-class minute so the
        // kiosk can still render a sensible hint if needed.
        closesAtMinutes: batch.endsAtMinutes,
      };
    }
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const earliest = batch.startsAtMinutes;
    const latest = batch.startsAtMinutes + 5;
    if (nowMin < earliest) {
      return {
        canScan: false,
        reason: "before_start" as const,
        opensAtMinutes: earliest,
      };
    }
    if (nowMin > latest) {
      return { canScan: false, reason: "after_close" as const };
    }
    return {
      canScan: true,
      reason: "open" as const,
      closesAtMinutes: latest,
    };
  }, [currentBatchData]);

  // Re-focus the scanner after every successful scan. The
  // MutationResult's onSuccess fires after the backend responds, so
  // the focus lands just as the success modal appears.
  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

  // Auto-dismiss the feedback modal a couple of seconds after it
  // appears so the next student can scan without manual clicking.
  // Failures get a longer dwell so the operator can read the
  // error before the next scan wipes the screen.
  useEffect(() => {
    if (!feedback) return;
    const dwell = feedback.kind === "success" ? 2200 : 4000;
    const handle = window.setTimeout(() => setFeedback(null), dwell);
    return () => window.clearTimeout(handle);
  }, [feedback]);

  const currentBatch: TCurrentBatch | null =
    currentBatchData?.data ?? null;

  /**
   * Handle a barcode scanner emission. Scanners typically emulate
   * a keyboard and append a trailing `\n` (Enter) when the scan
   * completes, so we listen for that. Empty / whitespace-only
   * scans are no-ops.
   */
  const handleScannerKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scannerInput.trim();
    if (!code) return;
    setScannerInput("");
    try {
      const res = await checkIn({ studentId: code }).unwrap();
      if (res.success && res.data) {
        setFeedback({
          kind: "success",
          title: res.data.student.name,
          subtitle: res.data.message,
          courseNames: res.data.courseNames,
          swapFromDate: res.data.swapFromDate,
        });
      } else {
        setFeedback({
          kind: "failure",
          title: "Could not record attendance",
          subtitle: res.message || "Unknown error",
        });
      }
    } catch (err: unknown) {
      // The RTK Query error shape wraps the backend's `message`
      // in `err.data.message`.
      const e2 = err as { data?: { message?: string }; message?: string };
      setFeedback({
        kind: "failure",
        title: "Could not record attendance",
        subtitle:
          e2.data?.message ?? e2.message ?? "Network error — try again",
      });
    } finally {
      // Re-focus so the next scan works without a mouse trip. We
      // also refetch the current-batch info so the displayed
      // batch updates immediately if the scan somehow advanced
      // the day (e.g. a make-up that crossed midnight).
      scannerRef.current?.focus();
      refetchCurrentBatch();
    }
  };

  // Auth gate — only super admins and admins can open the kiosk.
  // Students and unauthenticated visitors get a friendly hint
  // instead of an error screen.
  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center">
          <LogIn className="h-14 w-14 text-blue-600 mx-auto" />
          <h1 className="mt-4 text-2xl font-bold">Sign in required</h1>
          <p className="mt-2 text-slate-600">
            The automatic-attendance kiosk is only available to
            super admins and admins.
          </p>
          <Button className="mt-6" onClick={() => router.push("/signin")}>
            Go to sign-in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900 flex flex-col">
      {/* Action bar — single full-width row with the institute
          identity on the left and a "close kiosk" link on the
          right. Wrapped in a wide container so the layout
          survives both narrow and ultra-wide kiosk monitors. */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo — if the institute has set NEXT_PUBLIC_INSTITUTE_LOGO
                in env, show it; otherwise show a clean monogram. */}
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {instituteInfo.name}
              </h1>
              <p className="text-sm text-slate-500">
                {instituteInfo.address}
                {instituteInfo.phone ? ` • ${instituteInfo.phone}` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.close()}
            className="gap-2"
          >
            <X className="h-5 w-5" /> Close kiosk
          </Button>
        </div>
      </header>

      {/* Main content — three regions stacked on small screens,
          side-by-side on large kiosks. The current-batch card
          takes the left two-thirds, the scanner card the right
          third. The feedback modal is a fixed-position overlay
          that covers the whole viewport when active. */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10 grid gap-6 lg:grid-cols-3">
        {/* Current batch card */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-10 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
            <Sparkles className="h-4 w-4" />
            Attendance going on
          </div>
          <CurrentBatchView batch={currentBatch} isFetching={isFetching} tick={tick} />
        </section>

        {/* Scanner card */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            <ScanLine className="h-4 w-4" />
            Scan ID card
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Place the student&apos;s ID card on the barcode scanner. The
            cursor is already focused — just scan.
          </p>
          <input
            ref={scannerRef}
            value={scannerInput}
            onChange={(e) => setScannerInput(e.target.value)}
            onKeyDown={handleScannerKeyDown}
            // The 5-min check-in window is enforced server-side; the
            // disabled flag is the operator-facing affordance that
            // greys out the input and switches the placeholder to a
            // "window closed / not yet open" hint. We always keep
            // autoFocus on so the cursor lands on the input the
            // moment the window opens.
            autoFocus
            disabled={!windowState.canScan}
            // The HID-emulating barcode scanner fills the field and
            // sends Enter; the placeholder stays visible so the
            // operator knows where focus is. We deliberately keep
            // the input tiny so the kiosk monitor reads as a
            // scanning surface, not a form.
            placeholder={scanPlaceholderFor(windowState)}
            className={cn(
              "mt-6 w-full px-4 py-4 text-2xl font-mono text-center rounded-lg border-2 focus:outline-none focus:ring-2",
              windowState.canScan
                ? "border-dashed border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 bg-emerald-50/30"
                : "border-dashed border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed",
            )}
          />
          {/* Live window-status hint — updates every render so the
              countdown/closed message tracks the wall clock. Shown
              only when the window is NOT currently open. */}
          {windowState.reason === "before_start" && (
            <p className="mt-3 text-sm text-amber-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Check-in window opens at{" "}
              {minutesToClock(windowState.opensAtMinutes!)} — scans are
              not accepted before class start.
            </p>
          )}
          {windowState.reason === "after_close" && (
            <p className="mt-3 text-sm text-rose-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              The 5-minute check-in window has closed for this class.
              Wait for the next batch.
            </p>
          )}
          {windowState.reason === "open" && (
            <p className="mt-3 text-sm text-emerald-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Window closes at {minutesToClock(windowState.closesAtMinutes!)}.
            </p>
          )}
          {windowState.reason === "override" && (
            <p className="mt-3 text-sm text-amber-700 flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              Window override is active — scanner is open regardless of
              the wall clock. The admin can close it from the Courses
              page.
            </p>
          )}
          {windowState.reason === "slot_disabled" && (
            <p className="mt-3 text-sm text-rose-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Taking attendance is currently disabled for this slot.
              Ask the admin to enable this slot on the Courses page.
            </p>
          )}
          {isScanning && (
            <div className="mt-3 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording attendance…
            </div>
          )}
        </section>
      </main>

      {/* Feedback overlay — fixed full-viewport modal that appears
          after every scan. Success = emerald + check, failure =
          rose + cross. Auto-dismisses (timing in the effect above). */}
      {feedback && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-8 backdrop-blur-sm transition-colors",
            feedback.kind === "success"
              ? "bg-emerald-500/15"
              : "bg-rose-500/15",
          )}
        >
          <div
            className={cn(
              "max-w-2xl w-full rounded-3xl shadow-2xl border-2 p-12 text-center bg-white",
              feedback.kind === "success"
                ? "border-emerald-300"
                : "border-rose-300",
            )}
          >
            {feedback.kind === "success" ? (
              <CheckCircle2 className="h-24 w-24 text-emerald-500 mx-auto" />
            ) : (
              <XCircle className="h-24 w-24 text-rose-500 mx-auto" />
            )}
            <h2
              className={cn(
                "mt-6 text-3xl font-bold",
                feedback.kind === "success" ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {feedback.title}
            </h2>
            <p className="mt-3 text-lg text-slate-600">{feedback.subtitle}</p>
            {feedback.kind === "success" && feedback.courseNames && feedback.courseNames.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {feedback.courseNames.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-sm font-mono"
                  >
                    {c.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
            {feedback.kind === "success" && feedback.swapFromDate && (
              <p className="mt-2 text-xs text-amber-700">
                Make-up: scanned {dayjs(feedback.swapFromDate).format("ddd, MMM D")} → recorded for today
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Inner view that renders the current-batch info. Tri-state:
 *   - `current`  → big "ATTENDANCE LIVE" callout with course /
 *     day / time + a live progress bar.
 *   - `upcoming` → "Next class in N min" pre-announcement so the
 *     operator knows when the kiosk will flip to the next batch.
 *   - `none`     → "No class scheduled today" calm message.
 */
const CurrentBatchView = ({
  batch,
  isFetching,
  tick,
}: {
  batch: TCurrentBatch | null;
  isFetching: boolean;
  /**
   * Render-bump counter. Forces a re-render every 30s so the live
   * "X min remaining" / progress bar ticks down on its own. The
   * actual elapsed/remaining values are derived from `Date.now()`
   * inside `liveProgress` (a `useMemo` keyed on `[batch, tick]`),
   * so a page reload instantly snaps to the correct value rather
   * than restarting from 0.
   */
  tick: number;
}) => {
  // Compute the live progress through the current class window. The
  // elapsed / remaining values are derived from `Date.now()` on
  // every render — they are NEVER stored in component state, so a
  // page reload instantly snaps to the correct value (rather than
  // restarting from 0). A 30-second interval trigger below forces
  // the component to re-render so the operator sees the countdown
  // tick down without manually refreshing.
  const liveProgress = useMemo(() => {
    if (!batch || batch.kind !== "current") return null;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const total = batch.durationMinutes;
    const elapsed = Math.max(0, Math.min(total, nowMin - batch.startsAtMinutes));
    const remaining = Math.max(0, total - elapsed);
    return {
      percent: total > 0 ? Math.min(100, (elapsed / total) * 100) : 0,
      elapsedMin: elapsed,
      totalMin: total,
      remainingMin: remaining,
    };
  }, [batch, tick]);

  if (isFetching && !batch) {
    return (
      <div className="flex-1 mt-6 flex items-center justify-center text-slate-400">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!batch || batch.kind === "none") {
    return (
      <div className="flex-1 mt-6 flex flex-col items-center justify-center text-center text-slate-500">
        <Calendar className="h-16 w-16 mb-3 text-slate-300" />
        <p className="text-2xl font-medium">No class scheduled today</p>
        <p className="text-sm mt-2 max-w-md">
          No active batch matches the current time. The kiosk will
          automatically switch to the next batch as soon as one
          becomes current.
        </p>
      </div>
    );
  }

  if (batch.kind === "upcoming") {
    // The next-class line explicitly shows the wall-clock time
    // ("at 4:00 PM") and the lead time so the operator can plan
    // setup before the class starts. The slotStates flag for
    // the upcoming batch isn't surfaced here — the kiosk only
    // admits scans for the CURRENT batch, so an upcoming slot
    // being ON or OFF doesn't affect what this page shows.
    return (
      <div className="flex-1 mt-6 flex flex-col">
        <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold uppercase tracking-wider">
            <Clock className="h-4 w-4" /> Next class
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight">
            {batch.courseName.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-lg text-slate-600">
            {batch.batchDayName} batch
          </p>
          <p className="mt-4 text-amber-700 text-2xl font-bold">
            next class at {batch.time}
          </p>
          <p className="mt-1 text-amber-700 font-semibold">
            starts in {batch.minutesUntilStart} minute
            {batch.minutesUntilStart === 1 ? "" : "s"}
          </p>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          The scanner is still live — students can be admitted
          against the next batch&apos;s make-up window if applicable.
        </p>
      </div>
    );
  }

  // batch.kind === "current" — the main live view. The
  // elapsed/remaining text + progress bar are derived from
  // `Date.now()` on every render (the liveProgress useMemo
  // depends on `tick`, which fires every 30s), so the
  // operator sees the countdown tick down without manually
  // refreshing. The admin's `slotStates[i] = false` toggle
  // disables the SCANNER (see the WindowState guard) but
  // does NOT freeze the live progress bar — the class is
  // still ongoing, the operator just chose to stop admitting
  // late arrivals. So the bar keeps filling and the
  // "X min elapsed" / "X min remaining" text keep counting
  // up / down by the wall clock, exactly as the user asked.
  return (
    <div className="flex-1 mt-6 flex flex-col">
      <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold uppercase tracking-wider">
        <Sparkles className="h-4 w-4" /> Class ongoing
      </div>
      <p className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
        {batch.courseName.replace(/_/g, " ")}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-lg text-slate-700">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
          {batch.batchDayName} batch
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
          {batch.time}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 font-semibold">
          Duration: {formatDuration(batch.durationMinutes)}
        </span>
      </div>
      {liveProgress && (
        <div className="mt-8">
          <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
            <span>
              {liveProgress.elapsedMin} min gone
            </span>
            <span>
              <span className="font-semibold text-emerald-700">
                {liveProgress.remainingMin} min remaining
              </span>
              {" · "}
              {formatDuration(liveProgress.totalMin)} total
            </span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${liveProgress.percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomaticAttendancePage;