import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { buildMigrationUrl, requiresSsl } from "./src/config/env";

/**
 * Drizzle Kit configuration.
 *
 * Uses DIRECT_URL when available (Supabase / Neon require a direct, non-pooled
 * connection for DDL statements), otherwise falls back to DATABASE_URL or the
 * individual DB_* variables.
 */

const url = buildMigrationUrl();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
    ssl: requiresSsl(url) ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: false,
});
