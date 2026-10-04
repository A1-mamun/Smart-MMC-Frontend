"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Controlled confirmation modal — drop-in replacement for the
 * blocking `window.confirm()` browser dialog. Use the imperative
 * `useConfirmDialog()` hook (defined below) so the trigger can stay
 * synchronous with the rest of the click flow without threading
 * `open`/`onOpenChange` state through every caller.
 *
 * Why we replaced `window.confirm`:
 *   - The native browser dialog is rendered by the browser, not the
 *     page, so it ignores the app's design tokens (Tailwind / shadcn)
 *     and looks wildly out of place in the admin dashboard.
 *   - It's blocking on the main thread, which interferes with the
 *     pending fetches behind the click and can cause re-render flicker
 *     on slow networks.
 *   - It's not keyboard-accessible beyond `Esc`/`Enter` and can't be
 *     themed for dark mode.
 */
type Variant = "danger" | "default";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Optional extra detail rendered below the description (rendered as
   *  plain text; pass a JSX node for richer content). */
  detail?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant: Variant;
  /** Show the destructive icon + amber title bar. Defaults to true when
   *  variant === "danger". */
  destructive?: boolean;
  /** Disable the confirm button while the action is in flight. */
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant,
  destructive,
  isLoading,
  onConfirm,
}: ConfirmDialogProps) => {
  const isDanger = destructive ?? variant === "danger";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {isDanger && (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
              {detail && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground/80">
                  {detail}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "destructive" : "default"}
            onClick={() => onConfirm()}
            disabled={isLoading}
          >
            {isLoading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Imperative hook for confirm-before-action flows. Returns a `confirm`
 * function that opens the dialog and resolves with the user's choice.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirmDialog();
 *   const onDelete = async () => {
 *     const ok = await confirm({
 *       title: "Delete student?",
 *       description: "This can be reversed by an admin.",
 *       confirmLabel: "Delete",
 *       variant: "danger",
 *     });
 *     if (!ok) return;
 *     // …do the delete…
 *   };
 *   return (<>… <button onClick={onDelete}>Delete</button> {dialog} </>);
 */
export type ConfirmOptions = Omit<
  ConfirmDialogProps,
  "open" | "onOpenChange" | "onConfirm" | "isLoading"
>;

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

export const useConfirmDialog = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    // Closing without confirming → treat as cancel.
    if (pending) pending.resolve(false);
    setPending(null);
  };

  const handleConfirm = () => {
    if (!pending) return;
    pending.resolve(true);
    setPending(null);
  };

  const dialog = pending ? (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={handleOpenChange}
      title={pending.title}
      description={pending.description}
      detail={pending.detail}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      variant={pending.variant}
      destructive={pending.destructive}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, dialog };
};