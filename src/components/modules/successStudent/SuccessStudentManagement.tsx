"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Upload, Users, Loader2, ImageOff } from "lucide-react";
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
  useDeleteSuccessStudentMutation,
  useGetSuccessStudentsQuery,
} from "@/redux/features/successStudent/successStudent.api";
import { TSuccessStudent } from "@/types/successStudent";
import SuccessStudentUploadModal from "./SuccessStudentUploadModal";

/**
 * Admin success-student management page. Shows the live list of
 * "Hall of Fame" cards with photo, name, institute, and batch. The
 * "Add success student" button opens the two-step upload modal.
 *
 * Uses the same `useGetSuccessStudentsQuery` as the public landing
 * page — the 60s server cache + the RTK Query tag invalidation keep
 * the admin list and the public grid in sync.
 */
const SuccessStudentManagement = () => {
  const { data, isLoading, isError, refetch } = useGetSuccessStudentsQuery();
  const [deleteSuccessStudent, { isLoading: isDeleting }] =
    useDeleteSuccessStudentMutation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirmDialog();

  const students: TSuccessStudent[] = data?.data ?? [];

  const handleDelete = async (s: TSuccessStudent) => {
    const ok = await confirmAction({
      title: "Remove from Hall of Fame?",
      description:
        "This removes the card from the landing page and deletes the file from Cloudinary.",
      detail: s.name ? `Name: "${s.name}"` : undefined,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deleteSuccessStudent({ id: s.id }).unwrap();
      toast.success("Success student removed");
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
          <h1 className="text-2xl font-bold">Success Students</h1>
          <p className="text-sm text-muted-foreground">
            Manage the alumni cards shown in the landing-page &quot;Hall of
            Fame&quot; grid.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            <span>Add success student</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current cards</CardTitle>
          <CardDescription>
            Newest first. {students.length} student
            {students.length === 1 ? "" : "s"} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading success students…
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <ImageOff className="h-4 w-4" />
              Failed to load success students.
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Users className="mx-auto mb-2 h-6 w-6 opacity-60" />
              No success students yet. Add one to populate the landing page
              grid.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-md border bg-card"
                >
                  <div className="relative aspect-[3/4] bg-muted">
                    <Image
                      src={s.imageUrl}
                      alt={s.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-1 text-sm font-semibold">
                      {s.name}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {s.institute}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.batch}
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(s)}
                        disabled={isDeleting}
                        className="w-full"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SuccessStudentUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
      {confirmDialog}
    </div>
  );
};

export default SuccessStudentManagement;
