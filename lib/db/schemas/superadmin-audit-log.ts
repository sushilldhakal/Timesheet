import mongoose from "mongoose"

/**
 * SuperAdmin Audit Log
 * Tracks platform-level actions performed by super admins
 * Separate from tenant-scoped audit logs
 */

export type SuperAdminAction = 
  | "CREATE" 
  | "UPDATE" 
  | "DELETE" 
  | "APPROVE" 
  | "DENY"
  | "UPDATE_QUOTA"
  | "CREATE_ORG"
  | "DELETE_ORG"
  | "DEACTIVATE_USER"
  | "ACTIVATE_USER"

export interface ISuperAdminAuditLog {
  _id: mongoose.Types.ObjectId
  actor: string // Super admin user ID or email
  actorId: mongoose.Types.ObjectId // User ID
  action: SuperAdminAction
  entityType: string // e.g., "Employer", "User", "QuotaRequest", "SystemSettings"
  entityId: string // ID of the entity being modified
  orgId?: mongoose.Types.ObjectId | null // Related organization (if applicable)
  previousValue?: any // Previous value (for UPDATE actions)
  newValue?: any // New value (for CREATE/UPDATE actions)
  metadata?: Record<string, any> // Additional context
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface ISuperAdminAuditLogDocument extends ISuperAdminAuditLog, mongoose.Document {}

const superAdminAuditLogSchema = new mongoose.Schema<ISuperAdminAuditLogDocument>(
  {
    actor: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "APPROVE",
        "DENY",
        "UPDATE_QUOTA",
        "CREATE_ORG",
        "DELETE_ORG",
        "DEACTIVATE_USER",
        "ACTIVATE_USER",
      ],
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      default: null,
      index: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "superadmin_audit_logs",
  }
)

// Indexes for efficient querying
superAdminAuditLogSchema.index({ createdAt: -1 })
superAdminAuditLogSchema.index({ actorId: 1, createdAt: -1 })
superAdminAuditLogSchema.index({ orgId: 1, createdAt: -1 })
superAdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
superAdminAuditLogSchema.index({ action: 1, createdAt: -1 })

export const SuperAdminAuditLog =
  (mongoose.models.SuperAdminAuditLog as mongoose.Model<ISuperAdminAuditLogDocument>) ??
  mongoose.model<ISuperAdminAuditLogDocument>("SuperAdminAuditLog", superAdminAuditLogSchema)

/**
 * Helper function to create a superadmin audit log entry
 */
/** Mongoose casts 24-char hex strings to ObjectId for these schema paths. */
type ObjectIdInput = string | mongoose.Types.ObjectId

export async function createSuperAdminAuditLog(data: {
  actor: string
  actorId: ObjectIdInput
  action: SuperAdminAction
  entityType: string
  entityId: string
  orgId?: ObjectIdInput | null
  previousValue?: any
  newValue?: any
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await SuperAdminAuditLog.create(data)
  } catch (error) {
    console.error("Failed to create superadmin audit log:", error)
    // Don't throw - audit logging should not break the main operation
  }
}
