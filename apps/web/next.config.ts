import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@mypartner/common",
    "@mypartner/markdown-editor",
    "@mypartner/note-taking",
  ],
  ...(isDev
    ? {
        allowedDevOrigins: ["127.0.0.1", "localhost"],
        turbopack: { root: path.resolve(__dirname, "../..") },
      }
    : {}),
};

export default nextConfig;
