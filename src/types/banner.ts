/**
 * Public Banner shape — what the GET /banner endpoint returns.
 *
 * `imageUrl` is the Cloudinary secure_url. We use it directly with
 * `next/image` (the cloudinary hostname is whitelisted in
 * next.config.ts → images.remotePatterns).
 *
 * `publicId` is the Cloudinary public_id; we don't render it, but
 * the admin delete flow needs it (the backend's destroy call uses
 * the public_id, not the URL).
 *
 * `caption` is nullable — banners without a caption are valid.
 *
 * `createdBy` is a small projection (no password, no email, no
 * timestamps) so the admin list can show "Uploaded by X" without
 * a second request.
 */
export type TBanner = {
  id: string;
  imageUrl: string;
  publicId: string;
  caption: string | null;
  createdBy: {
    id: string;
    name: string;
    role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  };
  createdAt: string; // ISO timestamp from the server
  updatedAt: string;
};

/**
 * POST /banner body — the admin confirms a Cloudinary upload by
 * handing back the (secure_url, public_id) Cloudinary returned,
 * plus the optional caption. The server re-validates everything.
 */
export type TBannerCreateInput = {
  imageUrl: string;
  publicId: string;
  caption?: string;
};

/**
 * POST /banner/sign response — the params the browser needs to
 * append to its multipart POST to Cloudinary. The browser builds
 * a `FormData` with these fields + the file and POSTs to
 * `https://api.cloudinary.com/v1_1/{cloudName}/image/upload`.
 */
export type TCloudinarySignResponse = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
  folder: string;
};
