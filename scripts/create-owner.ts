/**
 * Creates the first real owner account without seeding demo data.
 *
 * The owner is created inside an existing organization (matched by ORG_SLUG)
 * or a new one when no organization with that slug exists yet.
 *
 * Values can be supplied via the environment or entered interactively:
 *
 *   OWNER_EMAIL    required
 *   OWNER_NAME     required
 *   OWNER_PASSWORD required (prompted twice when omitted)
 *   ORG_SLUG       default: withunion (env ORG_SLUG)
 *   ORG_NAME       default: WithUnion Technologies (env ORG_NAME)
 *
 * Usage:
 *   npm run db:create-owner
 *   OWNER_EMAIL=owner@example.com OWNER_NAME="Jane Doe" npm run db:create-owner
 *
 * The password is hashed with scrypt; it is never logged or stored in plaintext.
 */

import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../src/db";
import { hashPassword } from "../src/lib/password";
import { env } from "../src/config/env";
import { organizations, users } from "../src/db/schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!input.isTTY) {
      const rl = createInterface({ input, output });
      rl.question(question)
        .then((answer) => {
          rl.close();
          resolve(answer);
        })
        .catch((error) => {
          rl.close();
          reject(error);
        });
      return;
    }

    output.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    let value = "";

    const finish = (error?: Error) => {
      input.setRawMode(false);
      input.pause();
      input.off("data", onData);
      output.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003" || char === "\u0004") {
          finish(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (char >= " ") value += char;
      }
    };

    input.on("data", onData);
  });
}

async function promptText(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function readCredential(
  envValue: string | undefined,
  prompt: string
): Promise<string> {
  if (envValue && envValue.trim() !== "") return envValue.trim();

  const value = (await promptText(prompt)).trim();
  if (value === "") {
    throw new Error(`${prompt.replace(/:\s*$/, "")} cannot be empty.`);
  }
  return value;
}

async function main() {
  const email = (
    await readCredential( process.env.OWNER_EMAIL, "Owner email: ")
  ).toLowerCase();

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new Error("Enter a valid email address.");
  }

  const name = await readCredential( process.env.OWNER_NAME, "Owner name: ");

  let password = process.env.OWNER_PASSWORD ?? "";
  if (password === "") {
    password = await promptHidden("Password (min 12 characters): ");
    const confirmation = await promptHidden("Confirm password: ");
    if (password !== confirmation) throw new Error("Passwords do not match.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const orgSlug = (process.env.ORG_SLUG ?? env.org.slug).trim().toLowerCase();
  const orgName = (process.env.ORG_NAME ?? env.org.name).trim();

  if (!orgSlug) throw new Error("ORG_SLUG cannot be empty.");
  if (!orgName) throw new Error("ORG_NAME cannot be empty.");

  const [existingAccount] = await db
    .select({ id: users.id, organizationId: users.organizationId })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (existingAccount) {
    throw new Error(
      `An account with ${email} already exists. Logging in is email-based, so ` +
        "email addresses must be unique across organizations. Use another email " +
        "or reset that account's password instead."
    );
  }

  const [existingOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);

  let organizationId: string;
  let organizationName: string;
  let createdOrganization = false;

  if (existingOrg) {
    organizationId = existingOrg.id;
    organizationName = existingOrg.name;
  } else {
    const [created] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug: orgSlug,
        country: env.org.country,
        currency: env.org.currency,
        timezone: env.org.timezone,
        taxRate: env.org.taxRate,
        commissionRate: env.org.commissionRate,
        plan: "pro",
      })
      .returning({ id: organizations.id, name: organizations.name });

    organizationId = created.id;
    organizationName = created.name;
    createdOrganization = true;
  }

  const passwordHash = await hashPassword(password);

  const [owner] = await db
    .insert(users)
    .values({
      organizationId,
      name,
      email,
      role: "owner",
      title: "Owner",
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  console.log("\n✅ Owner account created");
  console.log(`   Email:        ${owner.email}`);
  console.log(`   Organization: ${organizationName} (${orgSlug})`);
  console.log(`   Organization ${createdOrganization ? "created" : "reused"}`);
  console.log("\n👉 Sign in at /login with the password you just set.\n");
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Could not create owner:", error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  });
