/**
 * Public SuccessStudent shape — what the GET /success-student
 * endpoint returns.
 *
 * `imageUrl` is the Cloudinary secure_url. We use it directly with
 * `next/image` (the cloudinary hostname is whitelisted in
 * next.config.ts → images.remotePatterns).
 *
 * `publicId` is the Cloudinary public_id; we don't render it, but
 * the admin delete flow needs it (the backend's destroy call uses
 * the public_id, not the URL).
 *
 * `name`, `institute`, `batch` are the three text fields the admin
 * supplies at upload time. `batch` is a free-text display string
 * (e.g. "Batch 25") rather than the HscBatch enum — see the
 * SuccessStudent Prisma model docstring for the rationale.
 *
 * `createdBy` is a small projection (no password, no email, no
 * timestamps) so the admin list can show "Added by X" without a
 * second request.
 */
export type TSuccessStudent = {
  id: string;
  name: string;
  institute: string;
  batch: string;
  imageUrl: string;
  publicId: string;
  createdBy: {
    id: string;
    name: string;
    role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  };
  createdAt: string; // ISO timestamp from the server
  updatedAt: string;
};

/**
 * POST /success-student body — the admin confirms a Cloudinary
 * upload by handing back the (secure_url, public_id) Cloudinary
 * returned, plus the three text fields. The server re-validates
 * everything.
 */
export type TSuccessStudentCreateInput = {
  name: string;
  institute: string;
  batch: string;
  imageUrl: string;
  publicId: string;
};

/**
 * POST /success-student/sign response — the params the browser
 * needs to append to its multipart POST to Cloudinary. The browser
 * builds a `FormData` with these fields + the file and POSTs to
 * `https://api.cloudinary.com/v1_1/{cloudName}/image/upload`.
 *
 * (Re-declared here even though the banner module has the same
 * shape — keeps the feature self-contained. Promote to a shared
 * `src/types/cloudinary.ts` once a third such modal exists.)
 */
export type TCloudinarySignResponse = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
  folder: string;
};
