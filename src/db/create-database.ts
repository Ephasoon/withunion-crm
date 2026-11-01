/**
 * Creates the application database if it does not already exist.
 *
 * This removes the need for the `psql` CLI to be on your PATH — a very common
 * pain point on Windows. It connects to the built-in `postgres` maintenance
 * database using the same credentials from .env, then issues CREATE DATABASE.
 *
 * On managed providers (Supabase, Neon, Railway) the database already exists
 * and cannot be created by the app user, so this step is skipped safely.
 *
 * Usage:  npm run db:create
 */

import "dotenv/config";
import { Client } from "pg";
import {
  buildAdminDatabaseUrl,
  buildDatabaseUrl,
  describeDatabase,
  isManagedDatabase,
  requiresSsl,
} from "../config/env";

async function createDatabase() {
  console.log("\n🗄️  WithUnion CRM — Database Setup\n");

  const target = describeDatabase();

  console.log(`   Provider: ${target.provider}`);
  console.log(`   Host:     ${target.host}:${target.port}`);
  console.log(`   Database: ${target.name}\n`);

  // Managed providers pre-create the database and forbid CREATE DATABASE.
  if (isManagedDatabase()) {
    console.log("ℹ️  Managed PostgreSQL detected — database already provisioned.");
    console.log("   Skipping CREATE DATABASE.\n");

    // Still verify we can actually reach it, so failures surface early.
    const url = buildDatabaseUrl();
    const client = new Client({
      connectionString: url,
      ssl: requiresSsl(url) ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 20_000,
    });

    try {
      await client.connect();
      await client.query("SELECT 1");
      console.log("✅ Connection verified\n");
      console.log("👉 Next step:  npm run db:push\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Could not connect to ${target.provider}.\n`);
      console.error(`   ${message}\n`);
      console.error("   Checklist:");
      console.error("   • Is DATABASE_URL copied correctly from your provider?");
      console.error("   • Did you replace [YOUR-PASSWORD] with the real password?");
      console.error("   • Is your IP allowed in the provider's network settings?\n");
      process.exit(1);
    } finally {
      await client.end().catch(() => undefined);
    }
    return;
  }

  // ── Local PostgreSQL ────────────────────────────────────────────────────────
  const dbName = target.name;
  const adminUrl = buildAdminDatabaseUrl();
  const client = new Client({
    connectionString: adminUrl,
    ssl: requiresSsl(adminUrl) ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15_000,
  });

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL server");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Could not connect to PostgreSQL.\n");

    if (message.includes("ECONNREFUSED")) {
      console.error("   PostgreSQL does not appear to be running.");
      console.error("   → Windows: Win+R → services.msc → start 'postgresql-x64-…'");
      console.error("   → macOS:   brew services start postgresql");
      console.error("   → Linux:   sudo systemctl start postgresql\n");
    } else if (message.includes("password authentication failed")) {
      console.error("   Wrong username or password.");
      console.error("   → Check DB_USER and DB_PASSWORD in your .env file\n");
    } else if (message.includes("ENOTFOUND")) {
      console.error("   Host not found.");
      console.error("   → Check DB_HOST in your .env file\n");
    } else {
      console.error(`   ${message}\n`);
    }
    process.exit(1);
  }

  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`ℹ️  Database "${dbName}" already exists — skipping creation`);
    } else {
      // Identifier cannot be parameterised, so quote it safely.
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`✅ Database "${dbName}" created successfully`);
    }

    console.log("\n👉 Next step:  npm run db:push\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Failed to create database: ${message}\n`);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

createDatabase();
