/**
 * Centralised environment configuration.
 *
 * Supports THREE connection styles so the same codebase runs locally,
 * on Supabase/Neon/Railway, and inside Docker without edits:
 *
 *   1. Individual parts  → DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
 *   2. Single URL        → DATABASE_URL=postgresql://user:pass@host:port/db
 *   3. Migration URL     → DIRECT_URL (bypasses connection poolers for DDL)
 *
 * Priority: DATABASE_URL wins if present, otherwise the URL is assembled
 * from the individual parts.
 */

function optional(key: string, fallback = ""): string {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

/**
 * Detects whether the target PostgreSQL server requires TLS.
 * Every managed provider (Supabase, Neon, Railway, RDS, Heroku) does.
 * Plain localhost does not.
 */
export function requiresSsl(connectionString: string): boolean {
  // Explicit override always wins.
  const explicit = process.env.DB_SSL;
  if (explicit !== undefined && explicit !== "") {
    return explicit.toLowerCase() === "true" || explicit === "1";
  }

  // sslmode=require / verify-full in the URL itself.
  if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(connectionString)) {
    return true;
  }
  if (/[?&]sslmode=disable/i.test(connectionString)) {
    return false;
  }

  // Known managed-Postgres hostnames.
  const managedHosts = [
    "supabase.co",
    "supabase.com",
    "pooler.supabase.com",
    "neon.tech",
    "aws.neon.tech",
    "railway.app",
    "rlwy.net",
    "render.com",
    "rds.amazonaws.com",
    "azure.com",
    "digitalocean.com",
    "ondigitalocean.com",
    "heroku",
    "cockroachlabs.cloud",
    "aivencloud.com",
    "planetscale",
  ];

  const lower = connectionString.toLowerCase();
  if (managedHosts.some((host) => lower.includes(host))) return true;

  // Local development — no TLS.
  const localHosts = ["localhost", "127.0.0.1", "::1", "host.docker.internal"];
  if (localHosts.some((host) => lower.includes(host))) return false;

  // Anything else remote: default to TLS for safety.
  return false;
}

/** Assemble a PostgreSQL connection string from discrete parts. */
function assembleFromParts(databaseName?: string): string {
  const host = optional("DB_HOST", "localhost");
  const port = num("DB_PORT", 5432);
  const name = databaseName ?? optional("DB_NAME", "withunion_crm");
  const user = optional("DB_USER", "postgres");
  const password = optional("DB_PASSWORD", "");

  // Encode credentials so special characters (@ : / # ?) don't break the URL.
  const safeUser = encodeURIComponent(user);
  const safePassword = encodeURIComponent(password);
  const credentials = safePassword ? `${safeUser}:${safePassword}` : safeUser;

  return `postgresql://${credentials}@${host}:${port}/${name}`;
}

/**
 * Runtime connection string used by the application.
 * On serverless platforms this should point at a transaction pooler.
 */
export function buildDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL;
  if (direct && direct.trim() !== "") return direct.trim();
  return assembleFromParts();
}

/**
 * Connection string used for schema migrations (`drizzle-kit push`).
 *
 * Transaction poolers (Supabase port 6543, PgBouncer) cannot run DDL
 * reliably, so providers give you a separate direct URL. Falls back to the
 * normal URL when DIRECT_URL is not set.
 */
export function buildMigrationUrl(): string {
  const migration = process.env.DIRECT_URL;
  if (migration && migration.trim() !== "") return migration.trim();
  return buildDatabaseUrl();
}

/** Connection string pointing at the `postgres` maintenance database. */
export function buildAdminDatabaseUrl(): string {
  // When a full URL is supplied, swap the database name for `postgres`.
  const direct = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (direct && direct.trim() !== "") {
    try {
      const url = new URL(direct.trim());
      url.pathname = "/postgres";
      return url.toString();
    } catch {
      return direct.trim();
    }
  }
  return assembleFromParts("postgres");
}

/** True when the app is running against a hosted provider rather than localhost. */
export function isManagedDatabase(): boolean {
  const url = buildDatabaseUrl().toLowerCase();
  return !(
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("host.docker.internal")
  );
}

/** Human-readable description of where the database lives (for /api/health). */
export function describeDatabase(): { host: string; port: number; name: string; provider: string } {
  const url = buildDatabaseUrl();
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    let provider = "postgresql";
    if (host.includes("supabase")) provider = "supabase";
    else if (host.includes("neon")) provider = "neon";
    else if (host.includes("railway") || host.includes("rlwy")) provider = "railway";
    else if (host.includes("rds.amazonaws")) provider = "aws-rds";
    else if (host.includes("render")) provider = "render";
    else if (host === "localhost" || host === "127.0.0.1") provider = "local";

    return {
      host,
      port: Number(parsed.port || 5432),
      name: parsed.pathname.replace(/^\//, "") || "postgres",
      provider,
    };
  } catch {
    return {
      host: optional("DB_HOST", "localhost"),
      port: num("DB_PORT", 5432),
      name: optional("DB_NAME", "withunion_crm"),
      provider: "local",
    };
  }
}

export const env = {
  // Server
  nodeEnv: optional("NODE_ENV", "development"),
  port: num("PORT", 3000),
  isProduction: optional("NODE_ENV", "development") === "production",

  // Database
  db: {
    host: optional("DB_HOST", "localhost"),
    port: num("DB_PORT", 5432),
    name: optional("DB_NAME", "withunion_crm"),
    user: optional("DB_USER", "postgres"),
    password: optional("DB_PASSWORD", ""),
    maxConnections: num("DB_MAX_CONNECTIONS", 0), // 0 = auto-detect
    get url() {
      return buildDatabaseUrl();
    },
    get migrationUrl() {
      return buildMigrationUrl();
    },
    get ssl() {
      return requiresSsl(buildDatabaseUrl());
    },
  },

  // Organization defaults used by the seeder
  org: {
    name: optional("ORG_NAME", "WithUnion Technologies"),
    slug: optional("ORG_SLUG", "withunion"),
    currency: optional("ORG_CURRENCY", "ETB"),
    country: optional("ORG_COUNTRY", "Ethiopia"),
    timezone: optional("ORG_TIMEZONE", "Africa/Addis_Ababa"),
    taxRate: optional("ORG_TAX_RATE", "15"),
    commissionRate: optional("ORG_COMMISSION_RATE", "5"),
  },

  // Auth — opaque session tokens stored (hashed) in the sessions table
  auth: {
    sessionTtlDays: num("SESSION_TTL_DAYS", 7),
    demoPassword: optional("DEMO_PASSWORD", "Withunion2024!"),
  },

  // AI providers
  ai: {
    openai: optional("OPENAI_API_KEY"),
    anthropic: optional("ANTHROPIC_API_KEY"),
    gemini: optional("GEMINI_API_KEY"),
  },

  // Payments
  payments: {
    chapa: optional("CHAPA_SECRET_KEY"),
    telebirrAppId: optional("TELEBIRR_APP_ID"),
    telebirrAppKey: optional("TELEBIRR_APP_KEY"),
    stripe: optional("STRIPE_SECRET_KEY"),
  },

  // Supabase (optional — only needed for Storage / Auth features)
  supabase: {
    url: optional("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  },
} as const;
