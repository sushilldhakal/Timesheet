import mongoose from "mongoose"

export type SwapStatus = "PENDING_RECIPIENT" | "PENDING_MANAGER" | "APPROVED" | "DENIED"

export interface IAuditEntry {
  action: string
  userId: mongoose.Types.ObjectId
  timestamp: Date
  details?: string
}

export interface IShiftSwapRequest {
  _id: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  requestorId: mongoose.Types.ObjectId
  recipientId: mongoose.Types.ObjectId
  requestorShiftId: mongoose.Types.ObjectId // Shift the requestor wants to swap
  recipientShiftId?: mongoose.Types.ObjectId | null // Shift the recipient offers (optional for one-way swaps)
  status: SwapStatus
  
  // Workflow tracking
  requestedAt: Date
  recipientAcceptedAt?: Date | null
  managerApprovedAt?: Date | null
  managerApprovedBy?: mongoose.Types.ObjectId | null
  deniedAt?: Date | null
  deniedBy?: mongoose.Types.ObjectId | null
  denialReason?: string
  
  // Additional information
  reason?: string // Requestor's reason for swap
  notes?: string // Additional notes
  
  // Audit trail
  auditLog: IAuditEntry[]
  
  createdAt: Date
  updatedAt: Date
}

export interface IShiftSwapRequestDocument extends IShiftSwapRequest, mongoose.Document {}

const AuditEntrySchema = new mongoose.Schema<IAuditEntry>(
  {
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    details: { type: String, default: "" },
  },
  { _id: false }
)

const shiftSwapRequestSchema = new mongoose.Schema<IShiftSwapRequestDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    requestorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    requestorShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    recipientShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING_RECIPIENT", "PENDING_MANAGER", "APPROVED", "DENIED"],
      default: "PENDING_RECIPIENT",
      required: true,
      index: true,
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    recipientAcceptedAt: {
      type: Date,
      default: null,
    },
    managerApprovedAt: {
      type: Date,
      default: null,
    },
    managerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deniedAt: {
      type: Date,
      default: null,
    },
    deniedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    denialReason: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    auditLog: {
      type: [AuditEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "shift_swap_requests",
  }
)

// Indexes
shiftSwapRequestSchema.index({ tenantId: 1, requestorId: 1, status: 1 })
shiftSwapRequestSchema.index({ tenantId: 1, recipientId: 1, status: 1 })
shiftSwapRequestSchema.index({ tenantId: 1, status: 1, requestedAt: 1 })

export const ShiftSwapRequest =
  (mongoose.models.ShiftSwapRequest as mongoose.Model<IShiftSwapRequestDocument>) ??
  mongoose.model<IShiftSwapRequestDocument>("ShiftSwapRequest", shiftSwapRequestSchema)
