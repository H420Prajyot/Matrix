import {
  users,
  projects,
  projectAssignments,
  vulnerabilities,
  vulnerabilityTotals,
  reports,
  auditLogs,
  notifications,
  type User,
  type UpsertUser,
  type InsertUser,
  type Project,
  type InsertProject,
  type ProjectWithDetails,
  type ProjectAssignment,
  type Vulnerability,
  type InsertVulnerability,
  type VulnerabilityWithDetails,
  type VulnerabilityTotals,
  type InsertVulnerabilityTotals,
  type Report,
  type InsertReport,
  type AuditLog,
  type InsertAuditLog,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Local authentication operations
  getUserByUsername(username: string): Promise<User | undefined>;
  validatePassword(user: User, password: string): Promise<boolean>;
  createUserWithPassword(userData: { username: string; password: string; email?: string; firstName?: string; lastName?: string; role: 'admin' | 'pentester' | 'client' }): Promise<User>;
  
  // User management operations
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: 'admin' | 'pentester' | 'client'): Promise<User[]>;
  updateUser(userId: string, userData: Partial<InsertUser>): Promise<User>;
  updateUserRole(userId: string, role: 'admin' | 'pentester' | 'client'): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProjectById(id: string): Promise<ProjectWithDetails | undefined>;
  getProjectsByClient(clientId: string): Promise<Project[]>;
  getProjectsByPentester(pentesterId: string): Promise<Project[]>;
  getAllProjects(): Promise<ProjectWithDetails[]>;
  updateProjectProgress(projectId: string, progress: number): Promise<Project>;
  assignPentesterToProject(projectId: string, pentesterId: string): Promise<ProjectAssignment>;
  
  // Vulnerability operations
  createVulnerability(vulnerability: InsertVulnerability): Promise<Vulnerability>;
  getVulnerabilitiesByProject(projectId: string): Promise<VulnerabilityWithDetails[]>;
  getVulnerabilitiesByPentester(pentesterId: string): Promise<VulnerabilityWithDetails[]>;
  updateVulnerabilityStatus(vulnerabilityId: string, status: 'open' | 'in_progress' | 'resolved' | 'false_positive'): Promise<Vulnerability>;
  getVulnerabilityStats(): Promise<{ critical: number; high: number; medium: number; low: number; informational: number }>;
  
  // Vulnerability totals operations
  createVulnerabilityTotals(totals: InsertVulnerabilityTotals): Promise<VulnerabilityTotals>;
  getVulnerabilityTotalsByProject(projectId: string): Promise<VulnerabilityTotals[]>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReportById(id: string): Promise<Report | undefined>;
  getReportsByProject(projectId: string): Promise<Report[]>;
  getLatestReportByProject(projectId: string): Promise<Report | undefined>;
  markOldReportsAsNotLatest(projectId: string): Promise<void>;
  
  // Audit log operations
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>;
  getRecentAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    activeProjects: number;
    totalVulnerabilities: number;
    activeTesters: number;
    totalClients: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Local authentication methods
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) return false;
    return await bcrypt.compare(password, user.password);
  }

  async createUserWithPassword(userData: { username: string; password: string; email?: string; firstName?: string; lastName?: string; role: 'admin' | 'pentester' | 'client' }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        password: hashedPassword,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      })
      .returning();
    return user;
  }

  // User management operations
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUsersByRole(role: 'admin' | 'pentester' | 'client'): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async updateUser(userId: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: 'admin' | 'pentester' | 'client'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  // Project operations
  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getProjectById(id: string): Promise<ProjectWithDetails | undefined> {
    const result = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        client: true,
        assignments: {
          with: {
            pentester: true,
          },
        },
        vulnerabilities: true,
        reports: true,
      },
    });
    return result as ProjectWithDetails | undefined;
  }

  async getProjectsByClient(clientId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async getProjectsByPentester(pentesterId: string): Promise<Project[]> {
    const assignedProjects = await db
      .select({ project: projects })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(eq(projectAssignments.pentesterId, pentesterId));
    
    return assignedProjects.map(item => item.project);
  }

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    const result = await db.query.projects.findMany({
      with: {
        client: true,
        assignments: {
          with: {
            pentester: true,
          },
        },
        vulnerabilities: true,
        reports: true,
      },
    });
    return result as ProjectWithDetails[];
  }

  async updateProjectProgress(projectId: string, progress: number): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ progress, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    return project;
  }

  async updateProject(projectId: string, projectData: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    return project;
  }

  async deleteProject(projectId: string): Promise<void> {
    // Delete project assignments first (foreign key constraint)
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, projectId));
    
    // Delete vulnerabilities associated with the project
    await db.delete(vulnerabilities).where(eq(vulnerabilities.projectId, projectId));
    
    // Delete reports associated with the project
    await db.delete(reports).where(eq(reports.projectId, projectId));
    
    // Finally delete the project
    await db.delete(projects).where(eq(projects.id, projectId));
  }

  async assignPentesterToProject(projectId: string, pentesterId: string): Promise<ProjectAssignment> {
    const [assignment] = await db
      .insert(projectAssignments)
      .values({ projectId, pentesterId })
      .returning();
    return assignment;
  }

  // Vulnerability operations
  async createVulnerability(vulnerabilityData: InsertVulnerability): Promise<Vulnerability> {
    const [vulnerability] = await db.insert(vulnerabilities).values(vulnerabilityData).returning();
    return vulnerability;
  }

  async createVulnerabilityTotals(totalsData: InsertVulnerabilityTotals): Promise<VulnerabilityTotals> {
    const [totals] = await db.insert(vulnerabilityTotals).values(totalsData).returning();
    return totals;
  }

  async getVulnerabilityTotalsByProject(projectId: string): Promise<VulnerabilityTotals[]> {
    const totals = await db.select().from(vulnerabilityTotals).where(eq(vulnerabilityTotals.projectId, projectId));
    return totals;
  }

  async getVulnerabilitiesByProject(projectId: string): Promise<VulnerabilityWithDetails[]> {
    const result = await db.query.vulnerabilities.findMany({
      where: eq(vulnerabilities.projectId, projectId),
      with: {
        project: true,
        pentester: true,
      },
    });
    return result as VulnerabilityWithDetails[];
  }

  async getVulnerabilitiesByPentester(pentesterId: string): Promise<VulnerabilityWithDetails[]> {
    const result = await db.query.vulnerabilities.findMany({
      where: eq(vulnerabilities.pentesterId, pentesterId),
      with: {
        project: true,
        pentester: true,
      },
    });
    return result as VulnerabilityWithDetails[];
  }

  async updateVulnerabilityStatus(vulnerabilityId: string, status: 'open' | 'in_progress' | 'resolved' | 'false_positive'): Promise<Vulnerability> {
    const [vulnerability] = await db
      .update(vulnerabilities)
      .set({ status, updatedAt: new Date() })
      .where(eq(vulnerabilities.id, vulnerabilityId))
      .returning();
    return vulnerability;
  }

  async getVulnerabilityStats(): Promise<{ critical: number; high: number; medium: number; low: number; informational: number }> {
    const stats = await db
      .select({
        severity: vulnerabilities.severity,
        count: count(),
      })
      .from(vulnerabilities)
      .groupBy(vulnerabilities.severity);

    const result = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };

    stats.forEach(stat => {
      result[stat.severity as keyof typeof result] = Number(stat.count);
    });

    return result;
  }

  // Report operations
  async createReport(reportData: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(reportData).returning();
    return report;
  }

  async getReportById(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getReportsByProject(projectId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.projectId, projectId))
      .orderBy(desc(reports.uploadedAt));
  }

  async getLatestReportByProject(projectId: string): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.projectId, projectId), eq(reports.isLatest, true)));
    return report;
  }

  async markOldReportsAsNotLatest(projectId: string): Promise<void> {
    await db
      .update(reports)
      .set({ isLatest: false })
      .where(eq(reports.projectId, projectId));
  }

  // Audit log operations
  async createAuditLog(auditLogData: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(auditLogData).returning();
    return auditLog;
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));
  }

  async getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    return notification;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result.count);
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    activeProjects: number;
    totalVulnerabilities: number;
    activeTesters: number;
    totalClients: number;
  }> {
    const [activeProjectsCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'active'));

    const [totalVulnsCount] = await db
      .select({ count: count() })
      .from(vulnerabilities);

    const [activeTestersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'pentester'), eq(users.isActive, true)));

    const [totalClientsCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'client'));

    return {
      activeProjects: Number(activeProjectsCount.count),
      totalVulnerabilities: Number(totalVulnsCount.count),
      activeTesters: Number(activeTestersCount.count),
      totalClients: Number(totalClientsCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
