import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: configDir,
  outputFileTracingIncludes: {
    "/*": [
      "./db/schema.sql",
      "./node_modules/better-sqlite3/**/*",
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
