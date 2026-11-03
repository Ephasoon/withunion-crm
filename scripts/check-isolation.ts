/**
 * Organization isolation check.
 *
 * Logs in as each seeded organization's admin and calls every read-only API
 * route. Any UUID belonging to the *other* organization appearing in a response
 * is reported as a leak.
 *
 * Usage:
 *   npm run db:seed
 *   npm run dev            # in another terminal
 *   npm run check:isolation
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { env } from "../src/config/env";
import {
  activities,
  aiInsights,
  clients,
  commissions,
  deals,
  documents,
  invoices,
  leads,
  notifications,
  organizations,
  payments,
  projects,
  users,
} from "../src/db/schema";

const BASE_URL = (process.env.ISOLATION_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PRIMARY_SLUG = process.env.ORG_SLUG ?? "withunion";
const SECONDARY_SLUG = "bluesky";

const READ_ROUTES = [
  "/api/leads?limit=100",
  "/api/clients?limit=100",
  "/api/projects?limit=100",
  "/api/invoices?limit=100",
  "/api/commissions",
  "/api/dashboard",
  "/api/analytics?period=1y",
  "/api/payments?limit=100",
  "/api/notifications",
  "/api/settings",
];

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const PROBE_VALUE = "isolation-write-probe";
const EXPECTED_WRITE_STATUSES = [403, 404];

type OrgFixtures = {
  leadId: string;
  clientId: string;
  projectId: string;
  invoiceId: string;
  leadName: string;
};

type OrgSnapshot = {
  leads: (typeof leads.$inferSelect)[];
  clients: (typeof clients.$inferSelect)[];
  projects: (typeof projects.$inferSelect)[];
  invoices: (typeof invoices.$inferSelect)[];
};

type ForeignMarkers = {
  ids: Set<string>;
  values: Set<string>;
};

type WriteAttempt = {
  label: string;
  method: "PATCH" | "DELETE" | "POST";
  url: string;
  body?: unknown;
};

type OrgContext = {
  id: string;
  name: string;
  email: string;
};

async function getOrgContext(slug: string): Promise<OrgContext> {
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org) {
    throw new Error(`Organization with slug "${slug}" was not found. Run npm run db:seed first.`);
  }

  const [admin] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.organizationId, org.id), inArray(users.role, ["owner", "admin"])))
    .orderBy(users.email)
    .limit(1);

  if (!admin) {
    throw new Error(`No owner/admin user found for organization "${slug}".`);
  }

  return {
    id: org.id,
    name: org.name,
    email: admin.email,
  };
}

async function collectOrgEntityIds(orgId: string): Promise<Set<string>> {
  const rows = await Promise.all([
    db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId)),
    db.select({ id: users.id }).from(users).where(eq(users.organizationId, orgId)),
    db.select({ id: clients.id }).from(clients).where(eq(clients.organizationId, orgId)),
    db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, orgId)),
    db.select({ id: deals.id }).from(deals).where(eq(deals.organizationId, orgId)),
    db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, orgId)),
    db.select({ id: invoices.id }).from(invoices).where(eq(invoices.organizationId, orgId)),
    db.select({ id: payments.id }).from(payments).where(eq(payments.organizationId, orgId)),
    db.select({ id: commissions.id }).from(commissions).where(eq(commissions.organizationId, orgId)),
    db.select({ id: activities.id }).from(activities).where(eq(activities.organizationId, orgId)),
    db.select({ id: notifications.id }).from(notifications).where(eq(notifications.organizationId, orgId)),
    db.select({ id: documents.id }).from(documents).where(eq(documents.organizationId, orgId)),
    db.select({ id: aiInsights.id }).from(aiInsights).where(eq(aiInsights.organizationId, orgId)),
  ]);

  return new Set(rows.flat().map((row) => row.id));
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: env.auth.demoPassword }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} ${await res.text()}`);
  }

  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error(`Login for ${email} did not return a session cookie.`);
  }

  return setCookie.split(";")[0];
}

function collectUuids(value: unknown, found: Set<string>): void {
  if (typeof value === "string") {
    const matches = value.match(UUID_PATTERN);
    if (matches) {
      for (const match of matches) found.add(match.toLowerCase());
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectUuids(item, found);
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectUuids(item, found);
    }
  }
}

/**
 * Creates a disposable record of each writable type so cross-org attempts can
 * target real IDs without risking the seeded demo rows. Removed in a finally.
 */
async function createFixtures(org: OrgContext): Promise<OrgFixtures> {
  const suffix = randomUUID();
  const leadName = `Isolation Check Lead ${suffix}`;

  return db.transaction(async (tx) => {
    const [client] = await tx
      .insert(clients)
      .values({
        organizationId: org.id,
        name: `Isolation Check Client ${suffix}`,
        email: `isolation-${suffix}@example.com`,
        notes: "Temporary fixture for isolation write checks",
        tags: ["isolation-check", "temporary"],
      })
      .returning();

    const [lead] = await tx
      .insert(leads)
      .values({
        organizationId: org.id,
        name: leadName,
        email: `isolation-${suffix}@example.com`,
        status: "new",
        stage: "lead",
        score: 10,
        value: "1000",
        notes: "Temporary fixture for isolation write checks",
        tags: ["isolation-check", "temporary"],
      })
      .returning();

    const [project] = await tx
      .insert(projects)
      .values({
        organizationId: org.id,
        clientId: client.id,
        name: `Isolation Check Project ${suffix}`,
        description: "Temporary fixture for isolation write checks",
        status: "planning",
        budget: "1000",
        spent: "0",
        progress: 0,
        tags: ["isolation-check", "temporary"],
      })
      .returning();

    const [invoice] = await tx
      .insert(invoices)
      .values({
        organizationId: org.id,
        clientId: client.id,
        invoiceNumber: `ISO-CHECK-${suffix}`,
        status: "draft",
        subtotal: "1000",
        taxRate: "15",
        taxAmount: "150",
        total: "1150",
        currency: "ETB",
        notes: "Temporary fixture for isolation write checks",
        lineItems: [],
      })
      .returning();

    return {
      leadId: lead.id,
      clientId: client.id,
      projectId: project.id,
      invoiceId: invoice.id,
      leadName,
    };
  });
}

async function deleteFixtures(fixtures: OrgFixtures): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(invoices).where(eq(invoices.id, fixtures.invoiceId));
    await tx.delete(projects).where(eq(projects.id, fixtures.projectId));
    await tx.delete(leads).where(eq(leads.id, fixtures.leadId));
    await tx.delete(clients).where(eq(clients.id, fixtures.clientId));
  });
}

async function snapshotOrg(orgId: string): Promise<OrgSnapshot> {
  const [leadRows, clientRows, projectRows, invoiceRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.organizationId, orgId)).orderBy(leads.id),
    db.select().from(clients).where(eq(clients.organizationId, orgId)).orderBy(clients.id),
    db.select().from(projects).where(eq(projects.organizationId, orgId)).orderBy(projects.id),
    db.select().from(invoices).where(eq(invoices.organizationId, orgId)).orderBy(invoices.id),
  ]);

  return {
    leads: leadRows,
    clients: clientRows,
    projects: projectRows,
    invoices: invoiceRows,
  };
}

function diffSnapshots(label: string, before: OrgSnapshot, after: OrgSnapshot): string[] {
  const failures: string[] = [];
  const tables = ["leads", "clients", "projects", "invoices"] as const;

  for (const table of tables) {
    if (JSON.stringify(before[table]) !== JSON.stringify(after[table])) {
      failures.push(`${label} — ${table} changed during cross-org write attempts`);
    }
  }

  return failures;
}

function collectForeignMarkers(snapshot: OrgSnapshot): ForeignMarkers {
  const ids = new Set<string>();
  collectUuids(snapshot, ids);

  const values = new Set<string>();
  for (const row of [...snapshot.leads, ...snapshot.clients]) {
    if (row.email) values.add(row.email.toLowerCase());
    if (row.phone) values.add(row.phone);
  }

  return { ids, values };
}

async function verifyAiChat(cookie: string, foreign: ForeignMarkers): Promise<string[]> {
  const failures: string[] = [];
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content:
              "List my leads, clients, projects and invoices with their IDs, emails and phone numbers.",
          },
        ],
      }),
    });
  } catch (error) {
    failures.push(
      `POST /api/ai/chat — request failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return failures;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    failures.push(`POST /api/ai/chat — HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    return failures;
  }

  const json = (await res.json()) as unknown;
  const returnedIds = new Set<string>();
  collectUuids(json, returnedIds);
  const leakedIds = [...returnedIds].filter((id) => foreign.ids.has(id));
  const text = JSON.stringify(json).toLowerCase();
  const leakedValues = [...foreign.values].filter(
    (value) => value && text.includes(value.toLowerCase())
  );

  if (leakedIds.length > 0) {
    failures.push(
      `POST /api/ai/chat — leaked ${leakedIds.length} foreign id(s): ${leakedIds.slice(0, 5).join(", ")}`
    );
  }

  if (leakedValues.length > 0) {
    failures.push(
      `POST /api/ai/chat — leaked foreign contact value(s): ${leakedValues.slice(0, 5).join(", ")}`
    );
  }

  if (leakedIds.length === 0 && leakedValues.length === 0) {
    console.log("   ✓ POST /api/ai/chat");
  }

  return failures;
}

async function verifyWriteActor(
  actor: OrgContext,
  cookie: string,
  foreignOrg: OrgContext,
  fixtures: OrgFixtures,
  foreign: ForeignMarkers
): Promise<string[]> {
  const failures: string[] = [];

  console.log(`\n→ ${actor.name} write attempts against ${foreignOrg.name}`);

  const attempts: WriteAttempt[] = [
    {
      label: "PATCH /api/leads/[id]",
      method: "PATCH",
      url: `${BASE_URL}/api/leads/${fixtures.leadId}`,
      body: { notes: PROBE_VALUE },
    },
    {
      label: "DELETE /api/leads/[id]",
      method: "DELETE",
      url: `${BASE_URL}/api/leads/${fixtures.leadId}`,
    },
    {
      label: "PATCH /api/clients/[id]",
      method: "PATCH",
      url: `${BASE_URL}/api/clients/${fixtures.clientId}`,
      body: { notes: PROBE_VALUE },
    },
    {
      label: "DELETE /api/clients/[id]",
      method: "DELETE",
      url: `${BASE_URL}/api/clients/${fixtures.clientId}`,
    },
    {
      label: "PATCH /api/projects/[id]",
      method: "PATCH",
      url: `${BASE_URL}/api/projects/${fixtures.projectId}`,
      body: { description: PROBE_VALUE },
    },
    {
      label: "DELETE /api/projects/[id]",
      method: "DELETE",
      url: `${BASE_URL}/api/projects/${fixtures.projectId}`,
    },
    {
      label: "PATCH /api/invoices/[id]",
      method: "PATCH",
      url: `${BASE_URL}/api/invoices/${fixtures.invoiceId}`,
      body: { notes: PROBE_VALUE },
    },
    {
      label: "DELETE /api/invoices/[id]",
      method: "DELETE",
      url: `${BASE_URL}/api/invoices/${fixtures.invoiceId}`,
    },
    {
      label: "POST /api/leads/[id]/convert",
      method: "POST",
      url: `${BASE_URL}/api/leads/${fixtures.leadId}/convert`,
    },
  ];

  for (const attempt of attempts) {
    let res: Response;

    try {
      res = await fetch(attempt.url, {
        method: attempt.method,
        headers: {
          cookie,
          ...(attempt.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: attempt.body !== undefined ? JSON.stringify(attempt.body) : undefined,
      });
    } catch (error) {
      failures.push(
        `${attempt.label} — request failed: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    const body = await res.text().catch(() => "");

    if (!EXPECTED_WRITE_STATUSES.includes(res.status)) {
      failures.push(
        `${attempt.label} — expected 403/404, got ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`
      );
    } else {
      console.log(`   ✓ ${attempt.label} → ${res.status}`);
    }
  }

  failures.push(...(await verifyAiChat(cookie, foreign)));

  return failures;
}

async function verifyActor(
  actor: OrgContext,
  cookie: string,
  foreignIds: Set<string>
): Promise<string[]> {
  const failures: string[] = [];

  console.log(`\n→ ${actor.name} (${actor.email})`);

  for (const route of READ_ROUTES) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${route}`, { headers: { cookie } });
    } catch (error) {
      failures.push(`${route} — request failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      failures.push(`${route} — HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
      continue;
    }

    const json = (await res.json()) as unknown;
    const returnedIds = new Set<string>();
    collectUuids(json, returnedIds);

    const leaked = [...returnedIds].filter((id) => foreignIds.has(id));
    if (leaked.length > 0) {
      failures.push(
        `${route} — leaked ${leaked.length} foreign id(s): ${leaked.slice(0, 5).join(", ")}`
      );
    } else {
      console.log(`   ✓ ${route}`);
    }
  }

  return failures;
}

async function main() {
  console.log("\n🔒 WithUnion CRM — Organization isolation check\n");
  console.log(`   Target: ${BASE_URL}`);

  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (!health.ok) throw new Error(`HTTP ${health.status}`);
  } catch (error) {
    console.error(
      `\n❌ Cannot reach ${BASE_URL}. Start the app with "npm run dev" (or set ISOLATION_BASE_URL).`
    );
    console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
    return;
  }

  const primary = await getOrgContext(PRIMARY_SLUG);
  const secondary = await getOrgContext(SECONDARY_SLUG);

  const [primaryIds, secondaryIds] = await Promise.all([
    collectOrgEntityIds(primary.id),
    collectOrgEntityIds(secondary.id),
  ]);

  console.log(`   Primary org:   ${primary.name} (${primaryIds.size} entities)`);
  console.log(`   Secondary org: ${secondary.name} (${secondaryIds.size} entities)`);

  const primaryCookie = await login(primary.email);
  const secondaryCookie = await login(secondary.email);

  const failures = [
    ...(await verifyActor(primary, primaryCookie, secondaryIds)),
    ...(await verifyActor(secondary, secondaryCookie, primaryIds)),
  ];

  let primaryFixtures: OrgFixtures | undefined;
  let secondaryFixtures: OrgFixtures | undefined;

  try {
    primaryFixtures = await createFixtures(primary);
    secondaryFixtures = await createFixtures(secondary);

    const before = {
      primary: await snapshotOrg(primary.id),
      secondary: await snapshotOrg(secondary.id),
    };

    failures.push(
      ...(await verifyWriteActor(
        secondary,
        secondaryCookie,
        primary,
        primaryFixtures,
        collectForeignMarkers(before.primary)
      )),
      ...(await verifyWriteActor(
        primary,
        primaryCookie,
        secondary,
        secondaryFixtures,
        collectForeignMarkers(before.secondary)
      ))
    );

    const after = {
      primary: await snapshotOrg(primary.id),
      secondary: await snapshotOrg(secondary.id),
    };

    failures.push(
      ...diffSnapshots(primary.name, before.primary, after.primary),
      ...diffSnapshots(secondary.name, before.secondary, after.secondary)
    );
  } finally {
    if (primaryFixtures) await deleteFixtures(primaryFixtures);
    if (secondaryFixtures) await deleteFixtures(secondaryFixtures);
  }

  if (failures.length > 0) {
    console.error("\n❌ Isolation check failed:\n");
    for (const failure of failures) console.error(`   • ${failure}`);
    console.error("");
    process.exitCode = 1;
    return;
  }

  console.log(
    "\n✅ Isolation check passed — no cross-org reads or writes succeeded and all records are intact.\n"
  );
}

main()
  .catch((error) => {
    console.error("\n❌ Isolation check crashed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
