import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Cloudinary CDN serves uploaded banner images from
      // res.cloudinary.com/<cloud_name>/image/upload/... — we
      // allow the whole hostname (any cloud name) so banners work
      // regardless of which Cloudinary account the operator uses.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  allowedDevOrigins: ["192.168.0.103", "192.168.0.104"],
};

export default nextConfig;
