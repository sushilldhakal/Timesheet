import crypto from "crypto";
import { connectDB } from "@/lib/db";
import OrgSignupRequest, { IOrgSignupRequest, CompanySize } from "@/lib/db/schemas/org-signup-request";
import { Employer, type EmployerPlan } from "@/lib/db/schemas/employer";
import { User } from "@/lib/db/schemas/user";
import { generateTokenWithExpiry } from "@/lib/utils/auth/auth-tokens";
import { sendEmail, sendSystemEmail } from "@/lib/mail/sendEmail";
import { UserTenant } from "@/lib/db/schemas/user-tenant";
import { generateOrgSignupSuperadminNotifyEmail } from "@/lib/mail/templates/org-signup-superadmin-notify";
import { generateOrgSignupConfirmationEmail } from "@/lib/mail/templates/org-signup-confirmation";
import { generateOrgApprovedEmail } from "@/lib/mail/templates/org-approved";
import { generateOrgRejectedEmail } from "@/lib/mail/templates/org-rejected";
import { createSuperAdminAuditLog } from "@/lib/db/schemas/superadmin-audit-log";

export interface OrgSignupRequestInput {
  orgName: string;
  contactName: string;
  email: string;
  phone?: string;
  companySize?: CompanySize;
  planInterest?: EmployerPlan;
  message?: string;
  timezone?: string;
}

export class OrgSignupService {
  /**
   * Submit a new org signup request
   */
  static async submitRequest(input: OrgSignupRequestInput): Promise<IOrgSignupRequest> {
    await connectDB();

    // Validate required fields
    if (!input.orgName || !input.contactName || !input.email) {
      throw new Error("Organization name, contact name, and email are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error("Invalid email format");
    }

    // Check for existing approved request with same email
    const existingApproved = await OrgSignupRequest.findOne({
      email: input.email.toLowerCase(),
      status: "approved",
    });

    if (existingApproved) {
      throw new Error("An approved request already exists for this email address");
    }

    // Check for existing pending request with same email
    const existingPending = await OrgSignupRequest.findOne({
      email: input.email.toLowerCase(),
      status: "pending",
    });

    if (existingPending) {
      throw new Error("A pending request already exists for this email address");
    }

    // Create the request
    const request = await OrgSignupRequest.create({
      orgName: input.orgName.trim(),
      contactName: input.contactName.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone?.trim(),
      companySize: input.companySize,
      planInterest: input.planInterest || "free",
      message: input.message?.trim(),
      timezone: input.timezone || "Australia/Sydney",
      status: "pending",
    });

    // Send notification email to superadmin
    try {
      const superadminEmail = process.env.SUPERADMIN_EMAIL || "admin@timesheet.com";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const reviewUrl = `${appUrl}/dashboard/superadmin/org-requests`;

      const notifyEmail = generateOrgSignupSuperadminNotifyEmail({
        orgName: request.orgName,
        contactName: request.contactName,
        email: request.email,
        phone: request.phone,
        companySize: request.companySize,
        planInterest: request.planInterest,
        message: request.message,
        reviewUrl,
      });

      await sendSystemEmail({
        to: superadminEmail,
        subject: notifyEmail.subject,
        html: notifyEmail.html,
        plain: notifyEmail.plain,
      });
    } catch (error) {
      console.error("Failed to send superadmin notification email:", error);
      // Don't fail the request if email fails
    }

    // Send confirmation email to requester
    try {
      const confirmEmail = generateOrgSignupConfirmationEmail({
        contactName: request.contactName,
        orgName: request.orgName,
      });

      await sendSystemEmail({
        to: request.email,
        subject: confirmEmail.subject,
        html: confirmEmail.html,
        plain: confirmEmail.plain,
      });
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      // Don't fail the request if email fails
    }

    return request;
  }

  /**
   * List org signup requests with optional status filter
   */
  static async listRequests(status?: "pending" | "approved" | "rejected"): Promise<IOrgSignupRequest[]> {
    await connectDB();

    const filter = status ? { status } : {};
    const results = await OrgSignupRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email")
      .lean();
    return results as unknown as IOrgSignupRequest[];
  }

  /**
   * Get a single request by ID
   */
  static async getRequestById(requestId: string): Promise<IOrgSignupRequest | null> {
    await connectDB();
    const result = await OrgSignupRequest.findById(requestId)
      .populate("reviewedBy", "name email")
      .lean();
    return result as unknown as IOrgSignupRequest | null;
  }

  /**
   * Approve an org signup request
   * Creates the employer and admin user, sends approval email with setup link
   */
  static async approveRequest(
    requestId: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<{ employerId: string; userId: string }> {
    await connectDB();

    const request = await OrgSignupRequest.findById(requestId);
    if (!request) {
      throw new Error("Org signup request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Request has already been ${request.status}`);
    }

    // Generate slug from org name
    const baseSlug = request.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    while (await Employer.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create Employer
    const employer = await Employer.create({
      name: request.orgName,
      contactEmail: request.email,
      slug,
      plan: request.planInterest || "free",
      timezone: request.timezone || "Australia/Sydney",
      isActive: true,
    });

    // Generate password setup token (24h expiry)
    const tokenData = generateTokenWithExpiry(24);

    // Create admin User
    // Note: User schema needs passwordSetupToken and passwordSetupExpiry fields
    const user = await User.create({
      tenantId: employer._id,
      name: request.contactName,
      email: request.email,
      password: crypto.randomBytes(32).toString("hex"), // Temporary random password
      role: "admin",
      location: [],
      locationIds: [],
      rights: [],
      managedRoles: [],
      managedRoleIds: [],
      teamIds: [],
      createdBy: "system",
      passwordResetToken: tokenData.hashedToken, // Using passwordResetToken for setup
      passwordResetExpiry: tokenData.expiry,
    });

    // Join user to employer tenant
    await UserTenant.create({
      userId: user._id,
      tenantId: employer._id,
      role: "admin",
      isActive: true,
    });

    // Update request
    request.status = "approved";
    request.reviewedBy = reviewedBy as any;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote;
    request.createdEmployerId = employer._id as any;
    request.createdUserId = user._id as any;
    await request.save();

    // Create audit log
    await createSuperAdminAuditLog({
      actor: reviewedBy,
      actorId: reviewedBy as any,
      action: "CREATE_ORG",
      entityType: "OrgSignupRequest",
      entityId: requestId,
      orgId: employer._id as any,
      previousValue: { status: "pending" },
      newValue: { 
        status: "approved",
        employerId: employer._id.toString(),
        userId: user._id.toString(),
      },
      metadata: { reviewNote, orgName: request.orgName },
    });

    // Send approval email with setup link
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const setupUrl = `${appUrl}/setup-password?token=${tokenData.token}`;

      const approvalEmail = generateOrgApprovedEmail({
        contactName: request.contactName,
        orgName: request.orgName,
        setupUrl,
        expiryHours: 24,
      });

      await sendEmail({
        to: request.email,
        subject: approvalEmail.subject,
        html: approvalEmail.html,
        plain: approvalEmail.plain,
        orgId: employer._id.toString(),
      });
    } catch (error) {
      console.error("Failed to send approval email:", error);
      // Don't fail the approval if email fails
    }

    return {
      employerId: employer._id.toString(),
      userId: user._id.toString(),
    };
  }

  /**
   * Reject an org signup request
   */
  static async rejectRequest(
    requestId: string,
    reviewedBy: string,
    reviewNote: string
  ): Promise<void> {
    await connectDB();

    if (!reviewNote || reviewNote.trim().length === 0) {
      throw new Error("Review note is required for rejection");
    }

    const request = await OrgSignupRequest.findById(requestId);
    if (!request) {
      throw new Error("Org signup request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Request has already been ${request.status}`);
    }

    // Update request
    request.status = "rejected";
    request.reviewedBy = reviewedBy as any;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote;
    await request.save();

    // Create audit log
    await createSuperAdminAuditLog({
      actor: reviewedBy,
      actorId: reviewedBy as any,
      action: "DENY",
      entityType: "OrgSignupRequest",
      entityId: requestId,
      previousValue: { status: "pending" },
      newValue: { status: "rejected" },
      metadata: { reviewNote, orgName: request.orgName },
    });

    // Send rejection email
    try {
      const rejectionEmail = generateOrgRejectedEmail({
        contactName: request.contactName,
        orgName: request.orgName,
        reviewNote,
      });

      await sendEmail({
        to: request.email,
        subject: rejectionEmail.subject,
        html: rejectionEmail.html,
        plain: rejectionEmail.plain,
        orgId: "system",
      });
    } catch (error) {
      console.error("Failed to send rejection email:", error);
      // Don't fail the rejection if email fails
    }
  }

  /**
   * Get count of pending requests
   */
  static async getPendingCount(): Promise<number> {
    await connectDB();
    return OrgSignupRequest.countDocuments({ status: "pending" });
  }
}
