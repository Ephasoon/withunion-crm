import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { buildDatabaseUrl, requiresSsl, isManagedDatabase } from "@/config/env";
import * as schema from "./schema";

/**
 * Database connection.
 *
 * Works unchanged across:
 *   • Local PostgreSQL          (no TLS, large pool)
 *   • Supabase / Neon / Railway (TLS required)
 *   • Serverless (Vercel)       (tiny pool, transaction pooler)
 *   • Docker / Coolify VPS      (standard pool)
 *
 * The pool is cached on globalThis during development so Next.js hot-reload
 * doesn't exhaust PostgreSQL connections.
 */

const connectionString = buildDatabaseUrl();
const useSsl = requiresSsl(connectionString);

/**
 * Serverless runtimes create a new isolate per request, so a large pool would
 * quickly exhaust the database's connection limit. Detect Vercel/Lambda and
 * shrink the pool accordingly.
 */
function detectMaxConnections(): number {
  const explicit = Number(process.env.DB_MAX_CONNECTIONS);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.NETLIFY);

  if (isServerless) return 1;
  if (isManagedDatabase()) return 10;
  return 20;
}

const poolConfig: PoolConfig = {
  connectionString,
  max: detectMaxConnections(),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  // Managed providers terminate idle TCP sockets; keepalive avoids surprise resets.
  keepAlive: true,
};

if (useSsl) {
  // Supabase, Neon, Railway and RDS all present certificates signed by CAs that
  // are not in Node's default bundle for the pooler endpoints. Verifying the
  // chain would break the connection, so we encrypt without chain verification.
  poolConfig.ssl = { rejectUnauthorized: false };
}

const globalForDb = globalThis as typeof globalThis & {
  __withunionPool?: Pool;
};

export const pool = globalForDb.__withunionPool ?? new Pool(poolConfig);

// Surface connection problems instead of crashing the process silently.
pool.on("error", (error) => {
  console.error("[db] Unexpected PostgreSQL pool error:", error.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__withunionPool = pool;
}

export const db = drizzle(pool, { schema });

export { schema };
