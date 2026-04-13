import mongoose from "mongoose"
import { getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, setISOWeek } from "date-fns"

/**
 * Shift Interface
 * Represents a single work assignment within a roster
 */
export interface IShift {
  _id: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId | null // Reference to Employee (null = vacant shift)
  date: Date // Specific date for this shift
  startTime: Date // Time stored as Date in UTC
  endTime: Date // Time stored as Date in UTC
  locationId: mongoose.Types.ObjectId // Reference to Category with type "location"
  roleId: mongoose.Types.ObjectId // Reference to Category with type "role"
  sourceScheduleId: mongoose.Types.ObjectId | null // Reference to schedule that generated this (null = manual)
  estimatedCost: number // Calculated cost based on employee's award and penalty rules
  notes: string // Optional notes for the shift
  /** Break window stored as absolute UTC Date objects */
  breakStartTime?: Date
  breakEndTime?: Date
  /** Convenience total — kept in sync with breakStartTime/breakEndTime */
  breakMinutes?: number
  
  // NEW: Enhanced shift tracking
  requiredStaffCount?: number // Number of staff required for this shift slot
  currentStaffCount?: number // Number of staff currently assigned
  isUnderstaffed?: boolean // Flag indicating insufficient staff
  /** Draft shifts are manager-only until published; staff queries use published only */
  status?: "draft" | "published"
}

/**
 * Roster Interface
 * Represents a weekly shift plan document
 */
export interface IRoster {
  _id: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  weekId: string // ISO week format: "YYYY-Www" (e.g., "2024-W15")
  year: number // Year for indexing
  weekNumber: number // Week number (1-53) for indexing
  weekStartDate: Date // Monday of the week
  weekEndDate: Date // Sunday of the week
  shifts: IShift[] // Array of all shifts for this week
  status: "draft" | "published" // Roster publication status
  createdAt: Date
  updatedAt: Date
}

export interface IRosterDocument extends IRoster, mongoose.Document {}

/**
 * Calculate ISO week identifier from a date
 * ISO weeks start on Monday and are numbered 1-53
 * Week 1 is the week containing the first Thursday of the year
 */
export function calculateWeekId(date: Date): string {
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `${year}-W${week.toString().padStart(2, "0")}`
}

/**
 * Calculate week start and end dates from week identifier
 */
export function getWeekBoundaries(weekId: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekId.split("-W")
  const year = parseInt(yearStr, 10)
  const weekNumber = parseInt(weekStr, 10)

  // Calculate Monday of the specified week
  const start = startOfISOWeek(setISOWeek(new Date(year, 0, 4), weekNumber))

  // Calculate Sunday of the specified week
  const end = endOfISOWeek(start)

  return { start, end }
}

/**
 * Mongoose schema for Shift (embedded in Roster documents)
 */
export const ShiftSchema = new mongoose.Schema<IShift>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    sourceScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    // NEW: Enhanced shift tracking
    requiredStaffCount: {
      type: Number,
      default: 1,
    },
    currentStaffCount: {
      type: Number,
      default: 0,
    },
    isUnderstaffed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    breakStartTime: { type: Date },
    breakEndTime:   { type: Date },
    breakMinutes:   { type: Number, min: 0 },
  },
  { _id: true }
)

// Add validation for shift time ordering
ShiftSchema.pre("validate", function (next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    next(new Error("startTime must be less than endTime"))
  } else {
    next()
  }
})

/**
 * Mongoose schema for Roster collection
 */
const rosterSchema = new mongoose.Schema<IRosterDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    weekId: {
      type: String,
      required: true,
      validate: {
        validator: function (weekId: string) {
          return /^\d{4}-W\d{2}$/.test(weekId)
        },
        message: "weekId must match format YYYY-Www (e.g., 2024-W15)",
      },
    },
    year: {
      type: Number,
      required: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 53,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    shifts: {
      type: [ShiftSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "rosters",
  }
)

// Tenant-scoped unique constraint: each tenant has one roster per week
rosterSchema.index({ tenantId: 1, weekId: 1 }, { unique: true })
rosterSchema.index({ year: 1, weekNumber: 1 })
rosterSchema.index({ "shifts.employeeId": 1, "shifts.date": 1 })
rosterSchema.index({ status: 1, weekStartDate: 1 })
rosterSchema.index({ weekStartDate: 1, weekEndDate: 1 }) // For calendar date range queries

// Validation: Ensure shift dates fall within roster week boundaries
rosterSchema.pre("validate", function (next) {
  if (this.shifts && this.shifts.length > 0) {
    const invalidShifts = this.shifts.filter((shift) => {
      const shiftDate = new Date(shift.date)
      return shiftDate < this.weekStartDate || shiftDate > this.weekEndDate
    })

    if (invalidShifts.length > 0) {
      next(
        new Error(
          `Shift dates must fall within roster week boundaries (${this.weekStartDate.toISOString()} to ${this.weekEndDate.toISOString()})`
        )
      )
    } else {
      next()
    }
  } else {
    next()
  }
})

export const Roster =
  (mongoose.models.Roster as mongoose.Model<IRosterDocument>) ??
  mongoose.model<IRosterDocument>("Roster", rosterSchema)
