import mongoose from "mongoose"

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "PUBLIC_HOLIDAY"
export type LeaveStatus = "PENDING" | "APPROVED" | "DENIED"

export interface ILeaveRecord {
  _id: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  startDate: Date
  endDate: Date
  leaveType: LeaveType
  status: LeaveStatus
  
  // Approval tracking
  approvedBy?: mongoose.Types.ObjectId | null
  approvedAt?: Date | null
  deniedBy?: mongoose.Types.ObjectId | null
  deniedAt?: Date | null
  denialReason?: string
  
  // Additional information
  notes?: string
  blockAutoFill: boolean // Whether to block auto-fill for this period
  
  createdAt: Date
  updatedAt: Date
}

export interface ILeaveRecordDocument extends ILeaveRecord, mongoose.Document {}

const leaveRecordSchema = new mongoose.Schema<ILeaveRecordDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["ANNUAL", "SICK", "UNPAID", "PUBLIC_HOLIDAY"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DENIED"],
      default: "PENDING",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    deniedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deniedAt: {
      type: Date,
      default: null,
    },
    denialReason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    blockAutoFill: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "leave_records",
  }
)

// Indexes for efficient querying
leaveRecordSchema.index({ tenantId: 1, employeeId: 1, startDate: 1, endDate: 1 })
leaveRecordSchema.index({ tenantId: 1, status: 1 })
leaveRecordSchema.index({ tenantId: 1, startDate: 1, endDate: 1 })

// Validation: endDate must be after or equal to startDate
leaveRecordSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    next(new Error("startDate must be before or equal to endDate"))
  } else {
    next()
  }
})

export const LeaveRecord =
  (mongoose.models.LeaveRecord as mongoose.Model<ILeaveRecordDocument>) ??
  mongoose.model<ILeaveRecordDocument>("LeaveRecord", leaveRecordSchema)
