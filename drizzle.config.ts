import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  dialect: "postgresql",
  schema: path.join(rootDir, "packages/database/src/schema.ts"),
  out: path.join(rootDir, "packages/database/drizzle"),
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
