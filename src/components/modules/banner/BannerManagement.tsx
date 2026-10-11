"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Upload, ImageOff, Loader2 } from "lucide-react";
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
  useDeleteBannerMutation,
  useGetBannersQuery,
} from "@/redux/features/banner/banner.api";
import { TBanner } from "@/types/banner";
import BannerUploadModal from "./BannerUploadModal";

/**
 * Admin banner management page. Shows the live list of banners with
 * thumbnails, captions, and uploader info. The "Upload banner" button
 * opens the two-step upload modal.
 *
 * Uses the same `useGetBannersQuery` as the public landing page —
 * the 60s server cache + the RTK Query tag invalidation keep the
 * admin list and the public page in sync.
 */
const BannerManagement = () => {
  const { data, isLoading, isError, refetch } = useGetBannersQuery();
  const [deleteBanner, { isLoading: isDeleting }] = useDeleteBannerMutation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirmDialog();

  const banners: TBanner[] = data?.data ?? [];

  const handleDelete = async (b: TBanner) => {
    const ok = await confirmAction({
      title: "Delete banner?",
      description: "This removes the banner from the landing page and deletes the file from Cloudinary.",
      detail: b.caption ? `Caption: "${b.caption}"` : undefined,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deleteBanner({ id: b.id }).unwrap();
      toast.success("Banner deleted");
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
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage the images shown in the landing-page hero carousel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            <span>Upload banner</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current banners</CardTitle>
          <CardDescription>
            Newest first. {banners.length} banner
            {banners.length === 1 ? "" : "s"} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading banners…
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <ImageOff className="h-4 w-4" />
              Failed to load banners.
            </div>
          ) : banners.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No banners yet. Upload one to populate the landing page hero.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {banners.map((b) => (
                <li
                  key={b.id}
                  className="overflow-hidden rounded-md border bg-card"
                >
                  <div className="relative aspect-[16/9] bg-muted">
                    <Image
                      src={b.imageUrl}
                      alt={b.caption || "Banner image"}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    {b.caption ? (
                      <p className="line-clamp-2 text-sm font-medium">
                        {b.caption}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        No caption
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      by {b.createdBy.name} ·{" "}
                      {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(b)}
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

      <BannerUploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      {confirmDialog}
    </div>
  );
};

export default BannerManagement;
