import mongoose from "mongoose"

export type ShiftType = "MORNING" | "AFTERNOON" | "NIGHT"
export type AvailabilityStatus = "PENDING" | "APPROVED" | "DECLINED"

export interface ITimeRange {
  start: string // "HH:mm" format
  end: string // "HH:mm" format
}

export interface IAvailabilityConstraint {
  _id: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId

  // Approval workflow
  status: AvailabilityStatus
  approvedBy?: mongoose.Types.ObjectId | null
  approvedAt?: Date | null
  declinedBy?: mongoose.Types.ObjectId | null
  declinedAt?: Date | null
  declineReason?: string | null

  // Day-level restrictions
  unavailableDays: number[] // 0=Sunday, 1=Monday, etc.

  // Time-level restrictions
  unavailableTimeRanges: ITimeRange[]

  // Shift preferences
  preferredShiftTypes: ShiftType[]

  // Consecutive days limit
  maxConsecutiveDays?: number | null

  // Rest period requirement
  minRestHours?: number | null

  // Temporary availability
  temporaryStartDate?: Date | null
  temporaryEndDate?: Date | null

  reason?: string // Explanation for the constraint

  createdAt: Date
  updatedAt: Date
}

export interface IAvailabilityConstraintDocument extends IAvailabilityConstraint, mongoose.Document {}

const TimeRangeSchema = new mongoose.Schema<ITimeRange>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
)

const availabilityConstraintSchema = new mongoose.Schema<IAvailabilityConstraintDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DECLINED"],
      default: "PENDING",
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    declinedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, default: null },
    unavailableDays: {
      type: [Number],
      default: [],
      validate: {
        validator: function (days: number[]) {
          return days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        },
        message: "unavailableDays must contain only integers from 0 to 6",
      },
    },
    unavailableTimeRanges: {
      type: [TimeRangeSchema],
      default: [],
    },
    preferredShiftTypes: {
      type: [String],
      enum: ["MORNING", "AFTERNOON", "NIGHT"],
      default: [],
    },
    maxConsecutiveDays: {
      type: Number,
      default: null,
      min: 1,
    },
    minRestHours: {
      type: Number,
      default: null,
      min: 0,
    },
    temporaryStartDate: {
      type: Date,
      default: null,
    },
    temporaryEndDate: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "availability_constraints",
  }
)

// Indexes
availabilityConstraintSchema.index({ tenantId: 1, employeeId: 1 })
availabilityConstraintSchema.index({ tenantId: 1, temporaryStartDate: 1, temporaryEndDate: 1 })

// Validation: temporaryEndDate must be after temporaryStartDate
availabilityConstraintSchema.pre("validate", function (next) {
  if (
    this.temporaryStartDate &&
    this.temporaryEndDate &&
    this.temporaryStartDate > this.temporaryEndDate
  ) {
    next(new Error("temporaryStartDate must be before temporaryEndDate"))
  } else {
    next()
  }
})

export const AvailabilityConstraint =
  (mongoose.models.AvailabilityConstraint as mongoose.Model<IAvailabilityConstraintDocument>) ??
  mongoose.model<IAvailabilityConstraintDocument>("AvailabilityConstraint", availabilityConstraintSchema)
