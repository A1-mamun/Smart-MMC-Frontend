"use client";

import { useState } from "react";
import {
  HandCoins,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDeletePpMutation,
  useGetPpsQuery,
} from "@/redux/features/pp/pp.api";
import { TPpWithStats } from "@/types/pp";
import AddPpModal from "./AddPpModal";
import PpDetailDialog from "./PpDetailDialog";

/**
 * PP (referral) management page.
 *
 * Admin sees a grid of PP cards. Each card shows the PP's name,
 * the count of students referred (via `_count.students` from the
 * list endpoint), and the count of payouts made. Clicking a card
 * opens the detail dialog, which loads the full data (students +
 * payout history) and surfaces the "Owed / Paid / Due" math.
 *
 * "Add PP" opens a one-field modal (just a name). Delete is
 * soft-delete — preserves the audit trail of payouts.
 */
const PpManagement = () => {
  const { data, isLoading, isError, isFetching, refetch } = useGetPpsQuery();
  const [deletePp, { isLoading: isDeleting }] = useDeletePpMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { confirm: confirmAction, dialog: confirmDialog } = useConfirmDialog();

  const pps: TPpWithStats[] = data?.data ?? [];

  const handleDelete = async (pp: TPpWithStats) => {
    const ok = await confirmAction({
      title: `Delete PP "${pp.name}"?`,
      description:
        "This soft-deletes the PP. Students currently linked will keep their PP fee, but the PP name will no longer appear on them. Payout history is preserved.",
      detail: `Added by ${pp.createdBy.name} · ${pp._count.students} student(s) referred · ${pp._count.payments} payout(s) recorded`,
      confirmLabel: "Delete PP",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deletePp({ id: pp.id }).unwrap();
      toast.success("PP deleted");
    } catch (err) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ||
        "Delete failed";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HandCoins className="h-6 w-6 text-primary" />
            PP — Referral Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track referrers and the per-student fees owed to them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            // `isFetching` is true for both the initial load and
            // any refetch (including the manual one this button
            // triggers), so the spinner reflects whatever in-
            // flight request is currently running. The button is
            // also disabled while the request is in flight so a
            // double-click can't queue up two refetches.
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Add PP</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
          <CardDescription>
            Newest first. {pps.length} PP{pps.length === 1 ? "" : "s"} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading PPs…
            </div>
          ) : isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load PPs. Try refreshing.
            </div>
          ) : pps.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              <HandCoins className="mx-auto mb-2 h-6 w-6 opacity-60" />
              No PPs yet. Click <span className="font-medium">Add PP</span> to
              create your first referrer.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pps.map((pp) => (
                <li
                  key={pp.id}
                  className="rounded-md border bg-card p-4 transition hover:border-primary/50"
                >
                  <button
                    type="button"
                    onClick={() => setDetailId(pp.id)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">
                          {pp.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {pp._count.students} student
                          {pp._count.students === 1 ? "" : "s"} referred
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border bg-muted/30 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Payouts
                        </p>
                        <p className="font-semibold">
                          {pp._count.payments}
                        </p>
                      </div>
                      <div className="rounded-md border bg-muted/30 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Click to view
                        </p>
                        <p className="truncate text-primary">Details →</p>
                      </div>
                    </div>
                  </button>
                  <div className="mt-3 border-t pt-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(pp)}
                      disabled={isDeleting}
                      className="w-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddPpModal open={addOpen} onOpenChange={setAddOpen} />
      {detailId && (
        <PpDetailDialog
          ppId={detailId}
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
};

export default PpManagement;