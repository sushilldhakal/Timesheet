import mongoose from "mongoose"

/**
 * Schedule Interface
 * Represents a recurring weekly work pattern for an employee
 */
export interface ISchedule {
  _id: mongoose.Types.ObjectId
  dayOfWeek: number[] // Array of integers 0-6 (0=Sunday, 6=Saturday)
  startTime: Date // Time stored as Date in UTC
  endTime: Date // Time stored as Date in UTC
  locationId: mongoose.Types.ObjectId // Reference to Category with type "location"
  roleId: mongoose.Types.ObjectId // Reference to Category with type "role"
  effectiveFrom: Date // Start date for this schedule
  effectiveTo: Date | null // End date (null = indefinite)
  
  // NEW: Enhanced scheduling fields
  priority?: number // Higher number = higher priority for conflict resolution
  isTemplate?: boolean // True if this is a role template, false for employee schedule
  isRotating?: boolean // True if this schedule rotates over multiple weeks
  rotationCycle?: number // Number of weeks in rotation cycle (e.g., 2 for fortnightly)
  rotationStartDate?: Date | null // Anchor date to calculate current rotation week
}

/**
 * Mongoose schema for Schedule (embedded in Employee documents)
 */
export const ScheduleSchema = new mongoose.Schema<ISchedule>(
  {
    dayOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator: function (days: number[]) {
          return (
            Array.isArray(days) &&
            days.length > 0 &&
            days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
          )
        },
        message: "dayOfWeek must contain only integers from 0 to 6",
      },
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
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
      default: null,
    },
    // NEW: Enhanced scheduling fields
    priority: {
      type: Number,
      default: 1,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    isRotating: {
      type: Boolean,
      default: false,
    },
    rotationCycle: {
      type: Number,
      default: undefined,
      min: 1,
    },
    rotationStartDate: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
)

// Add validation for time ordering
ScheduleSchema.pre("validate", function (next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    next(new Error("startTime must be less than endTime"))
  } else {
    next()
  }
})

// Add validation for date ordering
ScheduleSchema.pre("validate", function (next) {
  if (
    this.effectiveTo !== null &&
    this.effectiveFrom &&
    this.effectiveTo &&
    this.effectiveFrom > this.effectiveTo
  ) {
    next(new Error("effectiveFrom must be less than or equal to effectiveTo"))
  } else {
    next()
  }
})
