/**
 * Seeds the database with realistic Ethiopian business demo data.
 *
 * Safe to run repeatedly — it wipes existing rows first, so you always get a
 * clean, predictable dataset instead of duplicate-key errors.
 *
 * Usage:  npm run db:seed
 */

import "dotenv/config";
import { db, pool } from "./index";
import { hashPassword } from "../lib/password";
import { env } from "../config/env";
import {
  organizations,
  users,
  clients,
  leads,
  deals,
  projects,
  projectMembers,
  tasks,
  invoices,
  payments,
  commissions,
  activities,
  notifications,
  documents,
  aiInsights,
  auditLogs,
  sessions,
} from "./schema";

const ORG = {
  name: process.env.ORG_NAME ?? "WithUnion Technologies",
  slug: process.env.ORG_SLUG ?? "withunion",
  currency: process.env.ORG_CURRENCY ?? "ETB",
  country: process.env.ORG_COUNTRY ?? "Ethiopia",
  timezone: process.env.ORG_TIMEZONE ?? "Africa/Addis_Ababa",
  taxRate: process.env.ORG_TAX_RATE ?? "15",
  commissionRate: process.env.ORG_COMMISSION_RATE ?? "5",
};

const days = (n: number) => new Date(Date.now() + n * 86_400_000);

const monthStart = (offset: number) => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + offset);
  return date;
};

const atMonthDay = (offset: number, day: number) => {
  const date = monthStart(offset);
  const maxDay = offset === 0 ? new Date().getDate() : 28;
  date.setDate(Math.max(1, Math.min(day, maxDay)));
  return date;
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

async function clean() {
  // Delete in dependency order (children first).
  await db.delete(auditLogs);
  await db.delete(aiInsights);
  await db.delete(documents);
  await db.delete(notifications);
  await db.delete(activities);
  await db.delete(commissions);
  await db.delete(payments);
  await db.delete(invoices);
  await db.delete(tasks);
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(deals);
  await db.delete(leads);
  await db.delete(clients);
  await db.delete(sessions);
  await db.delete(users);
  await db.delete(organizations);
}

async function seed() {
  console.log("\n🌱 WithUnion CRM — Seeding database\n");

  console.log("   Clearing existing data…");
  await clean();

  // ── Organization ──────────────────────────────────────────────────────────
  const [org] = await db
    .insert(organizations)
    .values({
      name: ORG.name,
      slug: ORG.slug,
      industry: "Technology",
      email: "hello@withunion.com",
      phone: "+251911234567",
      website: "https://withunion.com",
      address: "Bole Road, Friendship Building",
      city: "Addis Ababa",
      country: ORG.country,
      currency: ORG.currency,
      timezone: ORG.timezone,
      taxRate: ORG.taxRate,
      commissionRate: ORG.commissionRate,
      plan: "pro",
    })
    .returning();

  console.log(`✅ Organization: ${org.name}`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const demoPasswordHash = await hashPassword(env.auth.demoPassword);

  const [owner, manager, rep1, rep2] = await db
    .insert(users)
    .values([
      {
        organizationId: org.id,
        name: "Abebe Kebede",
        email: "abebe@withunion.com",
        role: "owner",
        title: "CEO & Founder",
        department: "Executive",
        phone: "+251911234567",
        passwordHash: demoPasswordHash,
      },
      {
        organizationId: org.id,
        name: "Tigist Alemu",
        email: "tigist@withunion.com",
        role: "manager",
        title: "Sales Manager",
        department: "Sales",
        phone: "+251912345678",
        passwordHash: demoPasswordHash,
      },
      {
        organizationId: org.id,
        name: "Dawit Haile",
        email: "dawit@withunion.com",
        role: "sales_rep",
        title: "Senior Sales Representative",
        department: "Sales",
        phone: "+251913456789",
        passwordHash: demoPasswordHash,
      },
      {
        organizationId: org.id,
        name: "Sara Mengistu",
        email: "sara@withunion.com",
        role: "sales_rep",
        title: "Sales Representative",
        department: "Sales",
        phone: "+251914567890",
        passwordHash: demoPasswordHash,
      },
    ])
    .returning();

  console.log("✅ Users: 4");

  // ── Clients ───────────────────────────────────────────────────────────────
  const [c1, c2, c3, c4, c5] = await db
    .insert(clients)
    .values([
      {
        organizationId: org.id,
        name: "Haile Gebrselassie",
        email: "haile@ethiopiarunners.com",
        company: "Ethiopia Runners Club",
        industry: "Sports",
        phone: "+251911111111",
        city: "Addis Ababa",
        totalRevenue: "450000",
        totalProjects: 3,
        assignedToId: rep1.id,
        tags: ["vip", "recurring"],
        createdAt: days(-120),
      },
      {
        organizationId: org.id,
        name: "Almaz Tadesse",
        email: "almaz@bluenileTech.com",
        company: "Blue Nile Technologies",
        industry: "Technology",
        phone: "+251912222222",
        city: "Addis Ababa",
        totalRevenue: "820000",
        totalProjects: 5,
        assignedToId: rep1.id,
        tags: ["enterprise", "priority"],
        createdAt: days(-90),
      },
      {
        organizationId: org.id,
        name: "Biruk Tekle",
        email: "biruk@addishospital.com",
        company: "Addis Specialty Hospital",
        industry: "Healthcare",
        phone: "+251913333333",
        city: "Addis Ababa",
        totalRevenue: "1200000",
        totalProjects: 2,
        assignedToId: rep2.id,
        tags: ["healthcare", "vip"],
        createdAt: days(-70),
      },
      {
        organizationId: org.id,
        name: "Mekdes Girma",
        email: "mekdes@lucyschool.et",
        company: "Lucy International School",
        industry: "Education",
        phone: "+251914444444",
        city: "Addis Ababa",
        totalRevenue: "380000",
        totalProjects: 1,
        assignedToId: rep2.id,
        tags: ["education"],
        createdAt: days(-25),
      },
      {
        organizationId: org.id,
        name: "Yonas Bekele",
        email: "yonas@capitalconstruct.et",
        company: "Capital Construction PLC",
        industry: "Construction",
        phone: "+251915555555",
        city: "Dire Dawa",
        totalRevenue: "2100000",
        totalProjects: 4,
        assignedToId: manager.id,
        tags: ["construction", "enterprise"],
        createdAt: days(-150),
      },
    ])
    .returning();

  console.log("✅ Clients: 5");

  // ── Leads ─────────────────────────────────────────────────────────────────
  const createdLeads = await db
    .insert(leads)
    .values([
      {
        organizationId: org.id,
        name: "Hana Worku",
        email: "hana@nahotel.com",
        phone: "+251916666666",
        company: "NA Hotel Group",
        industry: "Hotel & Hospitality",
        source: "Website",
        status: "qualified",
        stage: "proposal",
        score: 78,
        value: "650000",
        assignedToId: rep1.id,
        nextFollowUp: days(2),
        tags: ["hotel", "high-value"],
        createdAt: days(-100),
      },
      {
        organizationId: org.id,
        name: "Tesfaye Abebe",
        email: "tesfaye@addisrestaurant.com",
        phone: "+251917777777",
        company: "Addis Traditional Restaurant",
        industry: "Restaurant",
        source: "Referral",
        status: "contacted",
        stage: "meeting",
        score: 62,
        value: "180000",
        assignedToId: rep2.id,
        nextFollowUp: days(1),
        tags: ["restaurant"],
        createdAt: days(-60),
      },
      {
        organizationId: org.id,
        name: "Selam Mulugeta",
        email: "selam@africanngo.org",
        phone: "+251918888888",
        company: "African Development NGO",
        industry: "NGO",
        source: "Social Media",
        status: "qualified",
        stage: "qualified",
        score: 55,
        value: "420000",
        assignedToId: rep1.id,
        nextFollowUp: days(5),
        tags: ["ngo"],
        createdAt: days(-80),
      },
      {
        organizationId: org.id,
        name: "Kaleb Desta",
        email: "kaleb@ethioretail.com",
        phone: "+251919999999",
        company: "Ethio Retail Chain",
        industry: "Retail",
        source: "Cold Call",
        status: "new",
        stage: "lead",
        score: 35,
        value: "290000",
        assignedToId: rep2.id,
        nextFollowUp: days(3),
        tags: ["retail"],
        createdAt: days(-40),
      },
      {
        organizationId: org.id,
        name: "Ruth Solomon",
        email: "ruth@precisionmfg.et",
        phone: "+251910000000",
        company: "Precision Manufacturing",
        industry: "Manufacturing",
        source: "Email Campaign",
        status: "qualified",
        stage: "negotiation",
        score: 85,
        value: "1500000",
        assignedToId: manager.id,
        nextFollowUp: days(1),
        tags: ["manufacturing", "enterprise", "high-value"],
        createdAt: days(-10),
      },
    ])
    .returning();

  console.log(`✅ Leads: ${createdLeads.length}`);

  // ── Deals ─────────────────────────────────────────────────────────────────
  const [d1, d2, d3] = await db
    .insert(deals)
    .values([
      {
        organizationId: org.id,
        title: "Hospital Management System",
        clientId: c3.id,
        stage: "won",
        value: "1200000",
        probability: 100,
        assignedToId: rep2.id,
        closedAt: days(-30),
      },
      {
        organizationId: org.id,
        title: "School ERP Implementation",
        clientId: c4.id,
        stage: "project",
        value: "380000",
        probability: 90,
        assignedToId: rep2.id,
      },
      {
        organizationId: org.id,
        title: "Construction Management Platform",
        clientId: c5.id,
        stage: "won",
        value: "2100000",
        probability: 100,
        assignedToId: manager.id,
        closedAt: days(-60),
      },
      {
        organizationId: org.id,
        title: "Blue Nile Cloud Migration",
        clientId: c2.id,
        stage: "negotiation",
        value: "820000",
        probability: 70,
        assignedToId: rep1.id,
        expectedCloseDate: days(21),
      },
      {
        organizationId: org.id,
        title: "Runners Club Membership Portal",
        clientId: c1.id,
        stage: "proposal",
        value: "450000",
        probability: 55,
        assignedToId: rep1.id,
        expectedCloseDate: days(35),
      },
    ])
    .returning();

  console.log("✅ Deals: 5");

  // ── Projects ──────────────────────────────────────────────────────────────
  const [p1, p2] = await db
    .insert(projects)
    .values([
      {
        organizationId: org.id,
        clientId: c3.id,
        dealId: d1.id,
        name: "HMS v2.0 — Patient Portal",
        description:
          "Full-stack hospital management system with patient portal, appointment scheduling, electronic records and billing.",
        status: "active",
        startDate: days(-20),
        dueDate: days(40),
        budget: "1200000",
        spent: "480000",
        progress: 40,
        managerId: owner.id,
        tags: ["healthcare", "flagship"],
      },
      {
        organizationId: org.id,
        clientId: c4.id,
        dealId: d2.id,
        name: "Lucy School ERP System",
        description:
          "Comprehensive school management covering admissions, grading, attendance and a parent portal.",
        status: "active",
        startDate: days(-10),
        dueDate: days(-3),
        budget: "380000",
        spent: "76000",
        progress: 20,
        managerId: manager.id,
        tags: ["education"],
      },
      {
        organizationId: org.id,
        clientId: c5.id,
        dealId: d3.id,
        name: "Capital Construction Platform",
        description:
          "Site management, equipment tracking and progress reporting for large construction projects.",
        status: "completed",
        startDate: days(-120),
        dueDate: days(-15),
        completedAt: days(-15),
        budget: "2100000",
        spent: "1980000",
        progress: 100,
        managerId: manager.id,
        tags: ["construction"],
      },
    ])
    .returning();

  console.log("✅ Projects: 3");

  // ── Project members ───────────────────────────────────────────────────────
  await db.insert(projectMembers).values([
    { projectId: p1.id, userId: rep1.id, role: "developer" },
    { projectId: p1.id, userId: rep2.id, role: "developer" },
    { projectId: p2.id, userId: rep2.id, role: "lead" },
  ]);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  await db.insert(tasks).values([
    {
      organizationId: org.id,
      projectId: p1.id,
      title: "Design patient registration flow",
      description: "Wireframes and clickable prototype for patient onboarding.",
      status: "done",
      priority: "high",
      assignedToId: rep1.id,
      estimatedHours: "16",
      actualHours: "14",
      completedAt: days(-6),
    },
    {
      organizationId: org.id,
      projectId: p1.id,
      title: "Implement appointment scheduling API",
      status: "in_progress",
      priority: "urgent",
      assignedToId: rep1.id,
      dueDate: days(5),
      estimatedHours: "24",
    },
    {
      organizationId: org.id,
      projectId: p1.id,
      title: "Build billing and invoicing module",
      status: "todo",
      priority: "high",
      assignedToId: rep2.id,
      dueDate: days(15),
      estimatedHours: "32",
    },
    {
      organizationId: org.id,
      projectId: p2.id,
      title: "Student admissions workflow",
      status: "in_progress",
      priority: "high",
      assignedToId: rep2.id,
      dueDate: days(8),
      estimatedHours: "20",
    },
    {
      organizationId: org.id,
      projectId: p2.id,
      title: "Parent portal authentication",
      status: "review",
      priority: "medium",
      assignedToId: rep1.id,
      dueDate: days(12),
      estimatedHours: "12",
    },
  ]);

  console.log("✅ Tasks: 5");

  // ── Invoices (last 6 months) ──────────────────────────────────────────────
  const clientPool = [c1, c2, c3, c4, c5];
  const invoicePlans: Array<{
    offset: number;
    amounts: number[];
    statuses: Array<"paid" | "sent" | "overdue">;
  }> = [
    { offset: -5, amounts: [520000, 310000, 180000], statuses: ["paid", "paid", "overdue"] },
    { offset: -4, amounts: [640000, 420000, 260000], statuses: ["paid", "paid", "sent"] },
    { offset: -3, amounts: [580000, 350000, 210000], statuses: ["paid", "paid", "overdue"] },
    { offset: -2, amounts: [820000, 460000, 300000], statuses: ["paid", "paid", "sent"] },
    { offset: -1, amounts: [940000, 510000, 340000], statuses: ["paid", "paid", "overdue"] },
    { offset: 0, amounts: [700000, 400000, 260000], statuses: ["paid", "sent", "overdue"] },
  ];

  const invoiceRows: (typeof invoices.$inferInsert)[] = [];
  let invoiceSeq = 1;

  for (const plan of invoicePlans) {
    plan.amounts.forEach((amount, index) => {
      const status = plan.statuses[index];
      const issueDate = atMonthDay(plan.offset, 3 + index * 6);
      const subtotal = Math.round(amount / 1.15);

      invoiceRows.push({
        organizationId: org.id,
        clientId: clientPool[(invoiceSeq + index) % clientPool.length].id,
        invoiceNumber: `INV-${issueDate.getFullYear()}-${String(invoiceSeq).padStart(3, "0")}`,
        status,
        issueDate,
        dueDate: atMonthDay(plan.offset, 20 + index * 2),
        paidAt: status === "paid" ? atMonthDay(plan.offset, 10 + index * 4) : null,
        subtotal: String(subtotal),
        taxRate: ORG.taxRate,
        taxAmount: String(amount - subtotal),
        total: String(amount),
        currency: ORG.currency,
        lineItems: [
          {
            description: `Professional services — phase ${index + 1}`,
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal,
          },
        ],
      });

      invoiceSeq += 1;
    });
  }

  const insertedInvoices = await db.insert(invoices).values(invoiceRows).returning();

  console.log(`✅ Invoices: ${insertedInvoices.length}`);

  // ── Payments ──────────────────────────────────────────────────────────────
  const paymentMethods = ["bank_transfer", "telebirr", "chapa", "stripe"];
  const paidInvoices = insertedInvoices.filter((invoice) => invoice.status === "paid");
  const paymentRows: (typeof payments.$inferInsert)[] = [];

  paidInvoices.forEach((invoice, index) => {
    paymentRows.push({
      organizationId: org.id,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: invoice.total ?? "0",
      currency: ORG.currency,
      method: paymentMethods[index % paymentMethods.length],
      status: "completed",
      reference: `TXN-${invoice.issueDate?.getFullYear() ?? new Date().getFullYear()}-${String(
        index + 1
      ).padStart(3, "0")}`,
      paidAt: invoice.paidAt,
    });
  });

  const pendingInvoice = insertedInvoices
    .filter((invoice) => invoice.status === "sent")
    .at(-1);
  const failedInvoice = insertedInvoices
    .filter((invoice) => invoice.status === "overdue")
    .at(-1);

  if (pendingInvoice) {
    paymentRows.push({
      organizationId: org.id,
      invoiceId: pendingInvoice.id,
      clientId: pendingInvoice.clientId,
      amount: pendingInvoice.total ?? "0",
      currency: ORG.currency,
      method: "chapa",
      status: "pending",
      reference: "TXN-PENDING-001",
      paidAt: null,
    });
  }

  if (failedInvoice) {
    paymentRows.push({
      organizationId: org.id,
      invoiceId: failedInvoice.id,
      clientId: failedInvoice.clientId,
      amount: failedInvoice.total ?? "0",
      currency: ORG.currency,
      method: "bank_transfer",
      status: "failed",
      reference: "TXN-FAILED-001",
      paidAt: null,
    });
  }

  await db.insert(payments).values(paymentRows);

  console.log(`✅ Payments: ${paymentRows.length}`);

  // ── Commissions (derived from paid invoices) ──────────────────────────────
  const reps = [owner, manager, rep1, rep2];
  const dealPool = [d1.id, d2.id, d3.id];
  const commissionRate = Number(ORG.commissionRate);
  const commissionRows: (typeof commissions.$inferInsert)[] = [];

  paidInvoices.forEach((invoice, index) => {
    const base = Number(invoice.total ?? 0);
    const isPaid = index < paidInvoices.length - 2;

    commissionRows.push({
      organizationId: org.id,
      userId: reps[index % reps.length].id,
      dealId: dealPool[index % dealPool.length],
      invoiceId: invoice.id,
      amount: String(Math.round((base * commissionRate) / 100)),
      rate: String(commissionRate),
      baseAmount: String(base),
      isPaid,
      paidAt: isPaid ? invoice.paidAt : null,
      month: monthKey(invoice.issueDate ?? new Date()),
      createdAt: invoice.paidAt ?? invoice.issueDate ?? new Date(),
    });
  });

  await db.insert(commissions).values(commissionRows);

  console.log(`✅ Commissions: ${commissionRows.length}`);

  // ── Activities ────────────────────────────────────────────────────────────
  await db.insert(activities).values([
    {
      organizationId: org.id,
      userId: rep1.id,
      type: "call",
      title: "Discovery call with NA Hotel Group",
      description: "Discussed CRM needs and hotel management pain points.",
      leadId: createdLeads[0].id,
      completedAt: days(-2),
    },
    {
      organizationId: org.id,
      userId: rep2.id,
      type: "meeting",
      title: "Product demo for Addis Specialty Hospital",
      description: "Full demonstration of HMS patient portal features.",
      clientId: c3.id,
      completedAt: days(-5),
    },
    {
      organizationId: org.id,
      userId: manager.id,
      type: "email",
      title: "Proposal sent to Precision Manufacturing",
      description: "Detailed proposal with phased pricing breakdown.",
      leadId: createdLeads[4].id,
      completedAt: days(-1),
    },
    {
      organizationId: org.id,
      userId: rep1.id,
      type: "note",
      title: "Blue Nile budget approved",
      description: "Finance confirmed ETB 820K budget for cloud migration.",
      clientId: c2.id,
      completedAt: days(-3),
    },
    {
      organizationId: org.id,
      userId: rep2.id,
      type: "whatsapp",
      title: "Follow-up with Lucy International School",
      description: "Confirmed invoice receipt, payment scheduled.",
      clientId: c4.id,
      completedAt: days(-4),
    },
  ]);

  console.log("✅ Activities: 5");

  // ── Notifications ─────────────────────────────────────────────────────────
  await db.insert(notifications).values([
    {
      organizationId: org.id,
      userId: owner.id,
      type: "invoice",
      title: "Invoice overdue",
      message: "INV-2024-003 for Capital Construction is 10 days overdue.",
      isRead: false,
      link: "/invoices",
    },
    {
      organizationId: org.id,
      userId: owner.id,
      type: "deal",
      title: "New high-value lead",
      message: "Precision Manufacturing has a potential deal worth ETB 1.5M.",
      isRead: false,
      link: "/leads",
    },
    {
      organizationId: org.id,
      userId: owner.id,
      type: "ai",
      title: "AI insight: conversion opportunity",
      message: "3 leads in negotiation are 80%+ likely to close this week.",
      isRead: false,
      link: "/pipeline",
    },
    {
      organizationId: org.id,
      userId: owner.id,
      type: "payment",
      title: "Payment received",
      message: "ETB 280,000 received from Blue Nile Technologies via Telebirr.",
      isRead: true,
      link: "/payments",
    },
    {
      organizationId: org.id,
      userId: owner.id,
      type: "task",
      title: "Task due soon",
      message: "Appointment scheduling API is due in 5 days.",
      isRead: true,
      link: "/projects",
    },
  ]);

  console.log("✅ Notifications: 5");

  // ── AI insights ───────────────────────────────────────────────────────────
  await db.insert(aiInsights).values([
    {
      organizationId: org.id,
      type: "deal_prediction",
      title: "Precision Manufacturing likely to close",
      content:
        "Strong engagement signals detected. Recommend scheduling a decision meeting within 48 hours to capture ETB 1.5M.",
      entityType: "lead",
      entityId: createdLeads[4].id,
      confidence: "87",
    },
    {
      organizationId: org.id,
      type: "revenue_forecast",
      title: "Q4 revenue projection",
      content:
        "Based on current pipeline velocity, projected Q4 revenue is ETB 11.8M (conservative ETB 10.2M, optimistic ETB 14.0M).",
      confidence: "74",
    },
  ]);

  console.log("✅ AI insights: 2");

  console.log("\n🎉 Database seeded successfully!\n");
  console.log("   Organization   WithUnion Technologies");
  console.log("   Users          4");
  console.log("   Clients        5");
  console.log("   Leads          5");
  console.log("   Deals          5");
  console.log("   Projects       3");
  console.log("   Tasks          5");
  console.log(`   Invoices       ${insertedInvoices.length}`);
  console.log(`   Payments       ${paymentRows.length}`);
  console.log(`   Commissions    ${commissionRows.length}`);
  console.log("   Activities     5");
  console.log("   Notifications  5");
  console.log("\n🔑 Demo accounts (all use DEMO_PASSWORD):");
  console.log("   abebe@withunion.com   owner");
  console.log("   tigist@withunion.com  manager");
  console.log("   dawit@withunion.com   sales_rep");
  console.log("   sara@withunion.com    sales_rep");
  console.log(`   Password: ${env.auth.demoPassword}`);
  console.log("\n👉 Next step:  npm run dev\n");
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Seed failed:", error);
    await pool.end();
    process.exit(1);
  });
