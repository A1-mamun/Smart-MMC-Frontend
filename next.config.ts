import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  allowedDevOrigins: ["192.168.0.103", "192.168.0.104"],
};

export default nextConfig;
