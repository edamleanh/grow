import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/print-roster reads templete-danh-sach.xlsx from disk at request
  // time (fs.readFile, not an import) — Next's serverless file tracing
  // doesn't always pick that up on its own, so it's listed explicitly to
  // make sure the file ships with the deployed function (e.g. on Vercel).
  outputFileTracingIncludes: {
    "/api/print-roster": ["./src/app/api/print-roster/templete-danh-sach.xlsx"],
  },
};

export default nextConfig;
