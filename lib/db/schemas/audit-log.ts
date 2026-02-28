import mongoose from "mongoose"

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "APPROVE" | "DENY"

export interface IAuditLog {
  _id: mongoose.Types.ObjectId
  organizationId?: string
  rosterId?: mongoose.Types.ObjectId | null
  employeeId?: mongoose.Types.ObjectId | null
  userId: mongoose.Types.ObjectId // User who performed the action
  action: AuditAction
  entityType: string // e.g., "Shift", "Roster", "SwapRequest", "LeaveRecord"
  entityId: string // ID of the entity being modified
  oldValue?: any // Previous value (for UPDATE actions)
  newValue?: any // New value (for CREATE/UPDATE actions)
  ipAddress?: string
  userAgent?: string
  
  createdAt: Date
}

export interface IAuditLogDocument extends IAuditLog, mongoose.Document {}

const auditLogSchema = new mongoose.Schema<IAuditLogDocument>(
  {
    organizationId: {
      type: String,
      default: undefined,
      index: true,
    },
    rosterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Roster",
      default: null,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "PUBLISH", "APPROVE", "DENY"],
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
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
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
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
    collection: "audit_logs",
  }
)

// Indexes for efficient querying
auditLogSchema.index({ organizationId: 1, createdAt: -1 })
auditLogSchema.index({ employeeId: 1, createdAt: -1 })
auditLogSchema.index({ rosterId: 1, createdAt: -1 })
auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })

export const AuditLog =
  (mongoose.models.AuditLog as mongoose.Model<IAuditLogDocument>) ??
  mongoose.model<IAuditLogDocument>("AuditLog", auditLogSchema)
