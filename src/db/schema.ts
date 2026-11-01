import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "manager",
  "sales_rep",
  "support",
  "viewer",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
]);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "lead",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "project",
  "support",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "task",
  "sms",
  "whatsapp",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "lead",
  "deal",
  "task",
  "invoice",
  "payment",
  "system",
  "ai",
]);

// ─── Organizations ─────────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  industry: text("industry"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Ethiopia"),
  currency: text("currency").default("ETB"),
  timezone: text("timezone").default("Africa/Addis_Ababa"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("15"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("5"),
  settings: jsonb("settings").default({}),
  plan: text("plan").default("starter"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar"),
    phone: text("phone"),
    role: userRoleEnum("role").default("sales_rep").notNull(),
    department: text("department"),
    title: text("title"),
    passwordHash: text("password_hash"),
    isActive: boolean("is_active").default(true),
    lastLoginAt: timestamp("last_login_at"),
    preferences: jsonb("preferences").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_org_idx").on(table.email, table.organizationId),
    index("users_org_idx").on(table.organizationId),
  ]
);

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Clients ───────────────────────────────────────────────────────────────────

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    industry: text("industry"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    country: text("country").default("Ethiopia"),
    avatar: text("avatar"),
    tags: text("tags").array().default([]),
    notes: text("notes"),
    totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0"),
    totalProjects: integer("total_projects").default(0),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    isActive: boolean("is_active").default(true),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("clients_org_idx").on(table.organizationId),
    index("clients_assigned_idx").on(table.assignedToId),
  ]
);

// ─── Leads ─────────────────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    industry: text("industry"),
    source: text("source"),
    status: leadStatusEnum("status").default("new").notNull(),
    stage: pipelineStageEnum("stage").default("lead").notNull(),
    score: integer("score").default(0),
    value: decimal("value", { precision: 15, scale: 2 }).default("0"),
    notes: text("notes"),
    tags: text("tags").array().default([]),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    convertedClientId: uuid("converted_client_id").references(() => clients.id),
    convertedAt: timestamp("converted_at"),
    nextFollowUp: timestamp("next_follow_up"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("leads_org_idx").on(table.organizationId),
    index("leads_stage_idx").on(table.stage),
    index("leads_assigned_idx").on(table.assignedToId),
    index("leads_status_idx").on(table.status),
  ]
);

// ─── Deals ─────────────────────────────────────────────────────────────────────

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    clientId: uuid("client_id").references(() => clients.id),
    leadId: uuid("lead_id").references(() => leads.id),
    stage: pipelineStageEnum("stage").default("lead").notNull(),
    value: decimal("value", { precision: 15, scale: 2 }).default("0"),
    probability: integer("probability").default(0),
    expectedCloseDate: timestamp("expected_close_date"),
    closedAt: timestamp("closed_at"),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    notes: text("notes"),
    tags: text("tags").array().default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("deals_org_idx").on(table.organizationId),
    index("deals_stage_idx").on(table.stage),
    index("deals_client_idx").on(table.clientId),
  ]
);

// ─── Projects ──────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id),
    dealId: uuid("deal_id").references(() => deals.id),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("planning").notNull(),
    startDate: timestamp("start_date"),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    budget: decimal("budget", { precision: 15, scale: 2 }).default("0"),
    spent: decimal("spent", { precision: 15, scale: 2 }).default("0"),
    progress: integer("progress").default(0),
    managerId: uuid("manager_id").references(() => users.id),
    tags: text("tags").array().default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_org_idx").on(table.organizationId),
    index("projects_client_idx").on(table.clientId),
    index("projects_status_idx").on(table.status),
  ]
);

// ─── Project Members ───────────────────────────────────────────────────────────

export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
    actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
    tags: text("tags").array().default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_org_idx").on(table.organizationId),
    index("tasks_project_idx").on(table.projectId),
    index("tasks_assigned_idx").on(table.assignedToId),
    index("tasks_status_idx").on(table.status),
  ]
);

// ─── Invoices ──────────────────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    projectId: uuid("project_id").references(() => projects.id),
    invoiceNumber: text("invoice_number").notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    issueDate: timestamp("issue_date").defaultNow(),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("15"),
    taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0"),
    currency: text("currency").default("ETB"),
    notes: text("notes"),
    terms: text("terms"),
    lineItems: jsonb("line_items").default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoices_org_idx").on(table.organizationId),
    index("invoices_client_idx").on(table.clientId),
    index("invoices_status_idx").on(table.status),
    uniqueIndex("invoices_number_org_idx").on(table.invoiceNumber, table.organizationId),
  ]
);

// ─── Payments ──────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").default("ETB"),
    method: text("method").default("bank_transfer"),
    status: paymentStatusEnum("status").default("pending").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    paidAt: timestamp("paid_at"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_org_idx").on(table.organizationId),
    index("payments_invoice_idx").on(table.invoiceId),
  ]
);

// ─── Commissions ───────────────────────────────────────────────────────────────

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    dealId: uuid("deal_id").references(() => deals.id),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
    baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
    isPaid: boolean("is_paid").default(false),
    paidAt: timestamp("paid_at"),
    month: text("month"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("commissions_org_idx").on(table.organizationId),
    index("commissions_user_idx").on(table.userId),
    index("commissions_month_idx").on(table.month),
  ]
);

// ─── Activities ────────────────────────────────────────────────────────────────

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: activityTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    leadId: uuid("lead_id").references(() => leads.id),
    clientId: uuid("client_id").references(() => clients.id),
    dealId: uuid("deal_id").references(() => deals.id),
    projectId: uuid("project_id").references(() => projects.id),
    scheduledAt: timestamp("scheduled_at"),
    completedAt: timestamp("completed_at"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activities_org_idx").on(table.organizationId),
    index("activities_lead_idx").on(table.leadId),
    index("activities_client_idx").on(table.clientId),
  ]
);

// ─── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message"),
    isRead: boolean("is_read").default(false),
    link: text("link"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_read_idx").on(table.isRead),
  ]
);

// ─── Documents ─────────────────────────────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    size: integer("size"),
    mimeType: text("mime_type"),
    clientId: uuid("client_id").references(() => clients.id),
    projectId: uuid("project_id").references(() => projects.id),
    leadId: uuid("lead_id").references(() => leads.id),
    uploadedById: uuid("uploaded_by_id").references(() => users.id),
    version: integer("version").default(1),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("documents_org_idx").on(table.organizationId),
    index("documents_client_idx").on(table.clientId),
  ]
);

// ─── AI Insights ───────────────────────────────────────────────────────────────

export const aiInsights = pgTable(
  "ai_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    confidence: decimal("confidence", { precision: 5, scale: 2 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_insights_org_idx").on(table.organizationId)]
);

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_org_idx").on(table.organizationId),
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ]
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  leads: many(leads),
  deals: many(deals),
  projects: many(projects),
  invoices: many(invoices),
  payments: many(payments),
  commissions: many(commissions),
  activities: many(activities),
  notifications: many(notifications),
  documents: many(documents),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(sessions),
  leads: many(leads),
  deals: many(deals),
  activities: many(activities),
  commissions: many(commissions),
  notifications: many(notifications),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  assignedTo: one(users, {
    fields: [clients.assignedToId],
    references: [users.id],
  }),
  deals: many(deals),
  projects: many(projects),
  invoices: many(invoices),
  activities: many(activities),
  documents: many(documents),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leads.organizationId],
    references: [organizations.id],
  }),
  assignedTo: one(users, {
    fields: [leads.assignedToId],
    references: [users.id],
  }),
  convertedClient: one(clients, {
    fields: [leads.convertedClientId],
    references: [clients.id],
  }),
  activities: many(activities),
  documents: many(documents),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id],
  }),
  lead: one(leads, {
    fields: [deals.leadId],
    references: [leads.id],
  }),
  assignedTo: one(users, {
    fields: [deals.assignedToId],
    references: [users.id],
  }),
  commissions: many(commissions),
  activities: many(activities),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  deal: one(deals, {
    fields: [projects.dealId],
    references: [deals.id],
  }),
  manager: one(users, {
    fields: [projects.managerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  tasks: many(tasks),
  invoices: many(invoices),
  documents: many(documents),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  payments: many(payments),
}));

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type NewOrganization = typeof organizations.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewClient = typeof clients.$inferInsert;
export type NewLead = typeof leads.$inferInsert;
export type NewDeal = typeof deals.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewTask = typeof tasks.$inferInsert;
export type NewInvoice = typeof invoices.$inferInsert;
export type NewPayment = typeof payments.$inferInsert;
export type NewCommission = typeof commissions.$inferInsert;
export type NewActivity = typeof activities.$inferInsert;
export type NewNotification = typeof notifications.$inferInsert;
