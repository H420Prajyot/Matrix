import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'pentester', 'client']);
export const projectStatusEnum = pgEnum('project_status', ['planned', 'active', 'completed', 'on_hold']);
export const severityEnum = pgEnum('severity', ['critical', 'high', 'medium', 'low', 'informational']);
export const vulnerabilityStatusEnum = pgEnum('vulnerability_status', ['open', 'in_progress', 'resolved', 'false_positive']);
export const auditActionEnum = pgEnum('audit_action', ['created', 'updated', 'deleted', 'viewed', 'downloaded']);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username"),
  password: varchar("password"), // For local authentication
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('client'),
  organization: varchar("organization"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // e.g., "Web Application", "Network", "Mobile App"
  clientId: varchar("client_id").references(() => users.id).notNull(),
  status: projectStatusEnum("status").default('planned'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  progress: integer("progress").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project assignments (many-to-many relationship between projects and pentesters)
export const projectAssignments = pgTable("project_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  pentesterId: varchar("pentester_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Vulnerabilities table
export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  pentesterId: varchar("pentester_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  severity: severityEnum("severity").notNull(),
  cvssScore: decimal("cvss_score", { precision: 3, scale: 1 }),
  impact: text("impact"),
  proofOfConcept: text("proof_of_concept"),
  recommendation: text("recommendation"),
  status: vulnerabilityStatusEnum("status").default('open'),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vulnerability totals table - stores vulnerability counts per project
export const vulnerabilityTotals = pgTable("vulnerability_totals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  pentesterId: varchar("pentester_id").references(() => users.id).notNull(),
  totalVulnerabilities: integer("total_vulnerabilities").default(0),
  totalHigh: integer("total_high").default(0),
  totalMedium: integer("total_medium").default(0),
  totalLow: integer("total_low").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reports table
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  pentesterId: varchar("pentester_id").references(() => users.id).notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  version: integer("version").default(1),
  isLatest: boolean("is_latest").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: auditActionEnum("action").notNull(),
  resourceType: varchar("resource_type").notNull(), // e.g., "project", "vulnerability", "report"
  resourceId: varchar("resource_id").notNull(),
  details: jsonb("details"), // Additional context about the action
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // e.g., "report_uploaded", "vulnerability_found", "project_update"
  isRead: boolean("is_read").default(false),
  relatedResourceType: varchar("related_resource_type"),
  relatedResourceId: varchar("related_resource_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clientProjects: many(projects),
  pentesterAssignments: many(projectAssignments),
  vulnerabilities: many(vulnerabilities),
  reports: many(reports),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(users, {
    fields: [projects.clientId],
    references: [users.id],
  }),
  assignments: many(projectAssignments),
  vulnerabilities: many(vulnerabilities),
  reports: many(reports),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  pentester: one(users, {
    fields: [projectAssignments.pentesterId],
    references: [users.id],
  }),
}));

export const vulnerabilitiesRelations = relations(vulnerabilities, ({ one }) => ({
  project: one(projects, {
    fields: [vulnerabilities.projectId],
    references: [projects.id],
  }),
  pentester: one(users, {
    fields: [vulnerabilities.pentesterId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
  pentester: one(users, {
    fields: [reports.pentesterId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform(val => val ? new Date(val) : null).nullable().optional(),
  endDate: z.string().transform(val => val ? new Date(val) : null).nullable().optional(),
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  discoveredAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  uploadedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertVulnerabilityTotalsSchema = createInsertSchema(vulnerabilityTotals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type VulnerabilityTotals = typeof vulnerabilityTotals.$inferSelect;
export type InsertVulnerabilityTotals = z.infer<typeof insertVulnerabilityTotalsSchema>;

// Extended types for joined data
export type ProjectWithDetails = Project & {
  client: User;
  assignments: (ProjectAssignment & { pentester: User })[];
  vulnerabilities: Vulnerability[];
  reports: Report[];
};

export type VulnerabilityWithDetails = Vulnerability & {
  project: Project;
  pentester: User;
};
