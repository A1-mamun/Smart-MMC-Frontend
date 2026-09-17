"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useGetMySmsLogsQuery,
  useSendSmsMutation,
} from "@/redux/features/sms/sms";
import type { TSmsRecipient } from "@/types/sms";
import dayjs from "dayjs";

type Props = {
  recipients: TSmsRecipient[];
  /** Optional callback fired after a successful send so the host can close a dialog. */
  onSent?: () => void;
  /** When true, hides the recipient editor (caller already supplies recipients). */
  hideRecipientEditor?: boolean;
  /**
   * When `recipients` changes externally (e.g. user picked a different cohort),
   * reset the message textarea? Defaults to false so staff can keep their
   * draft when iterating on the recipient list.
   */
  resetMessageOnRecipientChange?: boolean;
};

const MAX_LEN = 1600;

// GSM-7 (160 chars per SMS) vs UCS-2 (70 chars per SMS) rough split. We
// use 160 as the dividing line — anything <= 160 chars is assumed to
// fit in one part; longer messages are billed as ceil(len / 153) parts
// (the 7-char UDH allowance for multi-part GSM-7).
const estimateParts = (len: number): number => {
  if (len === 0) return 0;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
};

/**
 * Standalone SMS composer. The textarea + send button are always rendered
 * here; the recipient list is supplied by the parent (either the full
 * `/dashboard/sms` page via RecipientsPicker, or the per-row action on the
 * Students list). Sending ALWAYS uses the caller-provided recipient list so
 * the component is pure with respect to which addresses it talks to.
 */
const SmsComposer = ({
  recipients,
  onSent,
  hideRecipientEditor,
  resetMessageOnRecipientChange,
}: Props) => {
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendSms, { isLoading }] = useSendSmsMutation();

  // Snapshot the recipient list at send-time so async state changes don't
  // mutate what we actually delivered.
  const [pendingRecipients, setPendingRecipients] = useState<TSmsRecipient[]>([]);

  useEffect(() => {
    if (resetMessageOnRecipientChange) setMessage("");
  }, [recipients, resetMessageOnRecipientChange]);

  const len = message.length;
  const parts = estimateParts(len);
  const disabled =
    isLoading || recipients.length === 0 || message.trim().length === 0;
  const overLimit = len > MAX_LEN;

  const openConfirm = () => {
    if (disabled) return;
    setPendingRecipients(recipients);
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    try {
      const res = await sendSms({
        mode: recipients.length === 1 ? "ONE_TO_ONE" : "ONE_TO_MANY",
        recipients: pendingRecipients,
        message: message.trim(),
      }).unwrap();

      const upstreamCode = (res.data as { upstreamCode?: string } | null)?.upstreamCode;
      const skippedCount =
        (res.data as { skipped?: unknown[] } | null)?.skipped?.length ?? 0;
      const ok = res?.success;
      if (ok) {
        if (skippedCount > 0) {
          toast.success(
            `SMS sent to ${pendingRecipients.length - skippedCount} recipient(s) (${skippedCount} skipped: invalid number)`,
          );
        } else {
          toast.success(`SMS sent to ${pendingRecipients.length} recipient(s)`);
        }
        setMessage("");
        onSent?.();
      } else {
        toast.error(res?.message || "Failed to send SMS");
        if (upstreamCode) {
          toast.error(`Gateway code: ${upstreamCode}`);
        }
      }
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      toast.error(e?.data?.message || "Failed to send SMS");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Compose
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hideRecipientEditor && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">
              {recipients.length} recipient{recipients.length === 1 ? "" : "s"}{" "}
              selected
            </p>
            <p className="text-xs text-muted-foreground">
              Pick from the panel on the left. The send button reflects the
              current selection.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your SMS here..."
            rows={6}
            maxLength={MAX_LEN}
            className="resize-y min-h-[140px]"
          />
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                overLimit
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }
            >
              {len} / {MAX_LEN} chars · ~{parts} SMS part{parts === 1 ? "" : "s"}
            </span>
            {overLimit && (
              <span className="text-destructive">Over the {MAX_LEN}-char limit</span>
            )}
          </div>
        </div>

        <Button
          onClick={openConfirm}
          disabled={disabled || overLimit}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send to {recipients.length}{" "}
          recipient{recipients.length === 1 ? "" : "s"}
        </Button>

        <RecentLogs />
      </CardContent>

      {confirmOpen && (
        <ConfirmDialog
          count={pendingRecipients.length}
          message={message}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleSend}
        />
      )}
    </Card>
  );
};

/** Inline confirmation modal so the parent doesn't have to manage a Dialog. */
const ConfirmDialog = ({
  count,
  message,
  onCancel,
  onConfirm,
}: {
  count: number;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground rounded-md border shadow-lg max-w-sm w-full p-5 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="font-semibold">Send SMS?</h3>
            <p className="text-sm text-muted-foreground">
              You are about to send an SMS to <strong>{count}</strong>{" "}
              recipient{count === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <div className="rounded border bg-muted/40 p-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
          {message}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
};

const RecentLogs = () => {
  const { data, isFetching } = useGetMySmsLogsQuery({ limit: 10 });
  const logs = data?.data ?? [];

  if (!isFetching && logs.length === 0) return null;

  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        Recent sends
      </div>
      <div className="divide-y max-h-[180px] overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="px-3 py-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={
                  log.status === "SUCCESS"
                    ? "border-emerald-500 text-emerald-700"
                    : log.status === "FAILED"
                      ? "border-destructive text-destructive"
                      : ""
                }
              >
                {log.status === "SUCCESS" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : null}
                {log.status}
              </Badge>
              <span className="text-muted-foreground">
                {dayjs(log.createdAt).format("MMM D, h:mm A")}
              </span>
            </div>
            <p className="text-muted-foreground line-clamp-2">
              {log.message}
            </p>
            <p className="text-muted-foreground">
              {log.count} recipient{log.count === 1 ? "" : "s"}
              {log.upstreamCode ? ` · code ${log.upstreamCode}` : ""}
              {log.errorMsg ? ` · ${log.errorMsg}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmsComposer;