import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The client is one package in a pnpm workspace; point Turbopack at the
  // monorepo root so it resolves `next` and the lockfile correctly.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
