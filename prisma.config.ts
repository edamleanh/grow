import { defineConfig } from "prisma/config";
import "dotenv/config";

// Prisma 7 config: connection URLs live here (not in schema.prisma) and are
// used by Prisma Migrate / Studio. The running app connects via the driver
// adapter configured in src/lib/prisma.ts using the same DIRECT_URL env var.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
