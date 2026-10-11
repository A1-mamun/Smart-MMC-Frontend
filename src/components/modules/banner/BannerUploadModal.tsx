"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateBannerMutation,
  useSignBannerUploadMutation,
} from "@/redux/features/banner/banner.api";

type BannerUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Two-step upload:
 *   1. POST /banner/sign      → get signed params
 *   2. multipart POST to Cloudinary → get { secure_url, public_id }
 *   3. POST /banner           → row inserted
 *
 * We upload the file directly to Cloudinary (not via the backend)
 * so the file doesn't traverse the Node process — that would double
 * the bandwidth and tie up the worker for the duration of the upload.
 *
 * The native `fetch` + `FormData` does the upload; no Cloudinary
 * SDK is needed on the browser.
 */
export const BannerUploadModal = ({
  open,
  onOpenChange,
}: BannerUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [signUpload] = useSignBannerUploadMutation();
  const [createBanner] = useCreateBannerMutation();

  const busy = progress !== null;

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (busy) return; // don't let the admin close mid-upload
    reset();
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ACCEPTED.includes(f.type)) {
      toast.error("Unsupported file type. Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Image is larger than 5 MB. Pick a smaller file.");
      return;
    }
    setFile(f);
    // Build a local data URL for instant preview — no need to wait
    // for the Cloudinary round-trip.
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pick an image first.");
      return;
    }

    try {
      setProgress(0);

      // 1. Get signed params from the backend.
      const signRes = await signUpload(undefined).unwrap();
      const sig = signRes.data;
      if (!sig) throw new Error("Sign response missing data");

      // 2. Upload directly to Cloudinary. The signed params go in
      //    the FormData alongside the file. Cloudinary responds with
      //    { secure_url, public_id, ... }.
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("upload_preset", sig.uploadPreset);
      formData.append("folder", sig.folder);

      setProgress(25);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: formData },
      );
      if (!cloudRes.ok) {
        const errBody = await cloudRes.text();
        throw new Error(`Cloudinary upload failed: ${errBody.slice(0, 200)}`);
      }
      const cloudData = (await cloudRes.json()) as {
        secure_url: string;
        public_id: string;
      };
      setProgress(75);

      // 3. Commit the row.
      await createBanner({
        imageUrl: cloudData.secure_url,
        publicId: cloudData.public_id,
        caption: caption.trim() || undefined,
      }).unwrap();

      setProgress(100);
      toast.success("Banner uploaded");
      handleClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload banner</DialogTitle>
          <DialogDescription>
            Pick an image (max 5 MB, JPEG/PNG/WebP/GIF). Optionally add
            a caption that will overlay the image on the landing page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="banner-file">Image</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="banner-file"
                type="file"
                accept={ACCEPTED.join(",")}
                onChange={handleFileChange}
                disabled={busy}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90 disabled:opacity-50"
              />
            </div>
            {preview && (
              <div className="overflow-hidden rounded-md border">
                {/* Using a plain <img> here because the local data
                    URL is not a known next/image host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="preview"
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-caption">
              Caption <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="banner-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Shown as overlay text on the landing page"
              disabled={busy}
            />
            <p className="text-right text-xs text-muted-foreground">
              {caption.length} / 200
            </p>
          </div>

          {progress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  {file ? (
                    <Upload className="h-4 w-4" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  <span>Upload</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BannerUploadModal;
