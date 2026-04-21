import { OrgStorageQuotaRepo } from "@/lib/db/queries/org-storage-quota";
import { OrgEmailUsageRepo } from "@/lib/db/queries/org-email-usage";
import { QuotaRequestRepo } from "@/lib/db/queries/quota-request";
import { SystemSettingsRepo } from "@/lib/db/queries/system-settings";
import { IOrgStorageQuota } from "@/lib/db/schemas/org-storage-quota";
import { IOrgEmailUsage } from "@/lib/db/schemas/org-email-usage";
import { IQuotaRequest, QuotaRequestType } from "@/lib/db/schemas/quota-request";
import { createSuperAdminAuditLog } from "@/lib/db/schemas/superadmin-audit-log";
import mongoose from "mongoose";

export interface QuotaRequestInput {
  requestType: QuotaRequestType;
  requestedQuota: number;
  requestNote?: string;
}

export class QuotaService {
  /**
   * Get storage quota for an org (creates with defaults if doesn't exist)
   */
  static async getStorageQuota(orgId: string | mongoose.Types.ObjectId): Promise<IOrgStorageQuota> {
    let quota = await OrgStorageQuotaRepo.findByOrgId(orgId);
    
    if (!quota) {
      // Create with defaults from system settings
      const systemSettings = await SystemSettingsRepo.findOne();
      const defaultQuota = systemSettings?.defaultStorageQuotaBytes || 2147483648; // 2GB default

      quota = await OrgStorageQuotaRepo.create({
        orgId: new mongoose.Types.ObjectId(orgId.toString()),
        usedBytes: 0,
        quotaBytes: defaultQuota,
      });
    }

    return quota;
  }

  /**
   * Get email usage for an org (creates with defaults if doesn't exist, resets if past month)
   */
  static async getEmailUsage(orgId: string | mongoose.Types.ObjectId): Promise<IOrgEmailUsage> {
    let usage = await OrgEmailUsageRepo.findByOrgId(orgId);
    
    if (!usage) {
      // Create with defaults from system settings
      const systemSettings = await SystemSettingsRepo.findOne();
      const defaultQuota = systemSettings?.defaultEmailQuotaMonthly || 500;

      usage = await OrgEmailUsageRepo.create({
        orgId: new mongoose.Types.ObjectId(orgId.toString()),
        sentCount: 0,
        quotaMonthly: defaultQuota,
        periodStart: this.getMonthStart(),
      });
    } else {
      // Check if we need to reset for new month
      await this.resetEmailIfNewMonth(orgId);
      usage = (await OrgEmailUsageRepo.findByOrgId(orgId))!;
    }

    return usage;
  }

  /**
   * Increment storage usage
   */
  static async incrementStorage(orgId: string | mongoose.Types.ObjectId, bytes: number): Promise<void> {
    await OrgStorageQuotaRepo.incrementUsedBytes(orgId, bytes);
  }

  /**
   * Decrement storage usage
   */
  static async decrementStorage(orgId: string | mongoose.Types.ObjectId, bytes: number): Promise<void> {
    await OrgStorageQuotaRepo.decrementUsedBytes(orgId, bytes);
  }

  /**
   * Increment email sent count
   */
  static async incrementEmail(orgId: string | mongoose.Types.ObjectId): Promise<void> {
    await this.resetEmailIfNewMonth(orgId);
    await OrgEmailUsageRepo.incrementSentCount(orgId);
  }

  /**
   * Check if storage upload is allowed
   */
  static async checkStorageAllowed(orgId: string | mongoose.Types.ObjectId, newFileBytes: number): Promise<boolean> {
    const quota = await this.getStorageQuota(orgId);
    return quota.usedBytes + newFileBytes <= quota.quotaBytes;
  }

  /**
   * Check if email send is allowed
   */
  static async checkEmailAllowed(orgId: string | mongoose.Types.ObjectId): Promise<boolean> {
    const usage = await this.getEmailUsage(orgId);
    return usage.sentCount < usage.quotaMonthly;
  }

  /**
   * Reset email usage if we're in a new month
   */
  static async resetEmailIfNewMonth(orgId: string | mongoose.Types.ObjectId): Promise<void> {
    const usage = await OrgEmailUsageRepo.findByOrgId(orgId);
    if (!usage) return;

    const currentMonthStart = this.getMonthStart();
    const usagePeriodStart = new Date(usage.periodStart);

    // If periodStart is before current month, reset
    if (usagePeriodStart < currentMonthStart) {
      await OrgEmailUsageRepo.resetSentCount(orgId, currentMonthStart);
    }
  }

  /**
   * Get all orgs usage (for superadmin overview)
   */
  static async getAllOrgsUsage(): Promise<
    Array<{
      org: any;
      storageQuota: IOrgStorageQuota | null;
      emailUsage: IOrgEmailUsage | null;
    }>
  > {
    const storageQuotas = await OrgStorageQuotaRepo.findMany();
    const emailUsages = await OrgEmailUsageRepo.findMany();

    // Get unique org IDs from both collections
    const orgIds = new Set([
      ...storageQuotas.map((q) => q.orgId.toString()),
      ...emailUsages.map((u) => u.orgId.toString()),
    ]);

    // Fetch org details
    const { connectDB } = await import("@/lib/db");
    await connectDB();
    const { Employer } = await import("@/lib/db/schemas/employer");
    
    const orgs = await Employer.find({ _id: { $in: Array.from(orgIds) } }).lean();

    return orgs.map((org: any) => ({
      org,
      storageQuota: storageQuotas.find((q) => q.orgId.toString() === org._id.toString()) || null,
      emailUsage: emailUsages.find((u) => u.orgId.toString() === org._id.toString()) || null,
    }));
  }

  /**
   * Approve a quota request
   */
  static async approveQuotaRequest(
    requestId: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<void> {
    const request = await QuotaRequestRepo.findById(requestId);
    if (!request) throw new Error("Quota request not found");

    const previousQuota = request.currentQuota;
    const newQuota = request.requestedQuota;

    // Update the quota
    if (request.requestType === "storage") {
      await OrgStorageQuotaRepo.updateByOrgId(request.orgId, {
        quotaBytes: request.requestedQuota,
      });
    } else if (request.requestType === "email") {
      await OrgEmailUsageRepo.updateByOrgId(request.orgId, {
        quotaMonthly: request.requestedQuota,
      });
    }

    // Mark request as approved
    await QuotaRequestRepo.updateById(requestId, {
      status: "approved",
      reviewedBy: new mongoose.Types.ObjectId(reviewedBy),
      reviewedAt: new Date(),
      reviewNote,
    });

    // Create audit log
    await createSuperAdminAuditLog({
      actor: reviewedBy,
      actorId: new mongoose.Types.ObjectId(reviewedBy),
      action: "UPDATE_QUOTA",
      entityType: "QuotaRequest",
      entityId: requestId,
      orgId: request.orgId,
      previousValue: { quota: previousQuota, type: request.requestType },
      newValue: { quota: newQuota, type: request.requestType },
      metadata: { reviewNote },
    });
  }

  /**
   * Deny a quota request
   */
  static async denyQuotaRequest(requestId: string, reviewedBy: string, reviewNote: string): Promise<void> {
    const request = await QuotaRequestRepo.findById(requestId);
    if (!request) throw new Error("Quota request not found");

    await QuotaRequestRepo.updateById(requestId, {
      status: "denied",
      reviewedBy: new mongoose.Types.ObjectId(reviewedBy),
      reviewedAt: new Date(),
      reviewNote,
    });

    // Create audit log
    await createSuperAdminAuditLog({
      actor: reviewedBy,
      actorId: new mongoose.Types.ObjectId(reviewedBy),
      action: "DENY",
      entityType: "QuotaRequest",
      entityId: requestId,
      orgId: request.orgId,
      previousValue: { status: "pending" },
      newValue: { status: "denied" },
      metadata: { reviewNote },
    });
  }

  /**
   * Submit a quota request
   */
  static async submitQuotaRequest(
    orgId: string,
    requestedBy: string,
    input: QuotaRequestInput
  ): Promise<IQuotaRequest> {
    // Check if there's already a pending request of the same type
    const existingPending = await QuotaRequestRepo.findPendingByOrgIdAndType(orgId, input.requestType);
    if (existingPending) {
      throw new Error(`A pending ${input.requestType} quota request already exists for this organization`);
    }

    // Get current quota
    let currentQuota: number;
    if (input.requestType === "storage") {
      const quota = await this.getStorageQuota(orgId);
      currentQuota = quota.quotaBytes;
    } else {
      const usage = await this.getEmailUsage(orgId);
      currentQuota = usage.quotaMonthly;
    }

    // Create the request
    return QuotaRequestRepo.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      requestType: input.requestType,
      currentQuota,
      requestedQuota: input.requestedQuota,
      requestNote: input.requestNote,
      status: "pending",
    });
  }

  /**
   * Get start of current month
   */
  private static getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
