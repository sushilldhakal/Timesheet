import mongoose from "mongoose"

export interface ITimesheet {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId

  payPeriodStart: Date
  payPeriodEnd: Date

  shiftIds: mongoose.Types.ObjectId[]

  totalShifts: number
  totalHours: number
  totalCost: number
  totalBreakMinutes: number

  status: "draft" | "submitted" | "approved" | "rejected" | "locked"

  submittedBy?: mongoose.Types.ObjectId | null
  submittedAt?: Date | null
  submissionNotes?: string

  approvedBy?: mongoose.Types.ObjectId | null
  approvedAt?: Date | null

  rejectionReason?: string
  rejectedAt?: Date | null
  rejectedBy?: mongoose.Types.ObjectId | null

  lockedBy?: mongoose.Types.ObjectId | null
  lockedAt?: Date | null

  payRunId?: mongoose.Types.ObjectId | null

  notes?: string

  createdAt?: Date
  updatedAt?: Date
}

export interface ITimesheetDocument extends ITimesheet, mongoose.Document {}

const timesheetSchema = new mongoose.Schema<ITimesheetDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    payPeriodStart: {
      type: Date,
      required: true,
      index: true,
    },
    payPeriodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    shiftIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DailyShift",
      },
    ],
    totalShifts: {
      type: Number,
      default: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "locked"],
      default: "draft",
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    submittedAt: Date,
    submissionNotes: String,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,

    rejectionReason: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lockedAt: Date,

    payRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayRun",
    },

    notes: String,
  },
  {
    timestamps: true,
    collection: "timesheets",
  }
)

timesheetSchema.index({ tenantId: 1, employeeId: 1, payPeriodStart: 1 })
timesheetSchema.index({ tenantId: 1, status: 1 })
timesheetSchema.index({ tenantId: 1, payRunId: 1 })

export const Timesheet =
  (mongoose.models.Timesheet as mongoose.Model<ITimesheetDocument>) ??
  mongoose.model<ITimesheetDocument>("Timesheet", timesheetSchema)
