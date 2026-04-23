import mongoose from "mongoose"

/**
 * Tracks employee team assignments at specific locations
 * Replaces legacy Employee.role field (teamId references Team documents)
 */
export interface IEmployeeTeamAssignment {
  tenantId: mongoose.Types.ObjectId  // ref: Employer
  employeeId: mongoose.Types.ObjectId  // ref: Employee
  teamId: mongoose.Types.ObjectId      // ref: Team (scheduling team id)
  locationId: mongoose.Types.ObjectId  // ref: Location
  isPrimary: boolean                   // Primary assignment for employee
  validFrom: Date                      // When assignment starts
  validTo: Date | null                 // When assignment ends (null = indefinite)
  isActive: boolean                    // Computed: current date within range
  assignedBy: mongoose.Types.ObjectId  // ref: User (admin who assigned)
  assignedAt: Date                     // When the assignment was created
  notes?: string                       // Optional notes about assignment
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeTeamAssignmentDocument extends IEmployeeTeamAssignment, mongoose.Document {}

const employeeTeamAssignmentSchema = new mongoose.Schema<IEmployeeTeamAssignmentDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee ID is required"],
      validate: {
        validator: function(v: mongoose.Types.ObjectId) {
          return mongoose.Types.ObjectId.isValid(v)
        },
        message: "Employee ID must be a valid ObjectId"
      }
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team ID is required"],
      validate: {
        validator: function(v: mongoose.Types.ObjectId) {
          return mongoose.Types.ObjectId.isValid(v)
        },
        message: "Team ID must be a valid ObjectId"
      }
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Location ID is required"],
      validate: {
        validator: function(v: mongoose.Types.ObjectId) {
          return mongoose.Types.ObjectId.isValid(v)
        },
        message: "Location ID must be a valid ObjectId"
      }
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
      validate: {
        validator: function(v: Date) {
          return v instanceof Date && !isNaN(v.getTime())
        },
        message: "Valid from must be a valid date"
      }
    },
    validTo: {
      type: Date,
      default: null,
      validate: {
        validator: function(this: IEmployeeTeamAssignmentDocument, v: Date | null) {
          // If validTo is null, it's valid (indefinite assignment)
          if (v === null || v === undefined) return true
          
          // validTo must be a valid date
          if (!(v instanceof Date) || isNaN(v.getTime())) return false
          
          // validTo must be after validFrom
          return v > this.validFrom
        },
        message: "Valid to date must be after valid from date"
      }
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned by user ID is required"],
      validate: {
        validator: function(v: mongoose.Types.ObjectId) {
          return mongoose.Types.ObjectId.isValid(v)
        },
        message: "Assigned by must be a valid ObjectId"
      }
    },
    assignedAt: {
      type: Date,
      required: [true, "Assigned at date is required"],
      default: Date.now,
      validate: {
        validator: function(v: Date) {
          return v instanceof Date && !isNaN(v.getTime())
        },
        message: "Assigned at must be a valid date"
      }
    },
    notes: {
      type: String,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "employee_team_assignments",
  }
)

// Compound indexes for query performance
// Unique index to prevent duplicate assignments for the same employee/team/location with the same start date
employeeTeamAssignmentSchema.index(
  { tenantId: 1, employeeId: 1, teamId: 1, locationId: 1, validFrom: 1 },
  { unique: true }
)

// Index for getting employee's current assignments
employeeTeamAssignmentSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 })

// Index for getting employees for a team at a location
employeeTeamAssignmentSchema.index({ tenantId: 1, locationId: 1, teamId: 1, isActive: 1 })

// Pre-save hook to compute isActive field
employeeTeamAssignmentSchema.pre("save", function (next) {
  const now = new Date()
  const isWithinRange = this.validFrom <= now && (!this.validTo || this.validTo >= now)
  this.isActive = isWithinRange
  next()
})

// Validation to prevent overlapping assignments
employeeTeamAssignmentSchema.pre("save", async function (next) {
  // Skip validation if this is not a new document and dates haven't changed
  if (!this.isNew && !this.isModified("validFrom") && !this.isModified("validTo")) {
    return next()
  }

  const EmployeeTeamAssignment = this.constructor as mongoose.Model<IEmployeeTeamAssignmentDocument>

  // Check for overlapping assignments
  const overlappingQuery: any = {
    _id: { $ne: this._id }, // Exclude current document
    employeeId: this.employeeId,
    teamId: this.teamId,
    locationId: this.locationId,
  }

  // Check for date range overlap
  // Two date ranges overlap if: start1 < end2 AND start2 < end1
  if (this.validTo) {
    // This assignment has an end date
    overlappingQuery.$or = [
      {
        // Existing assignment has no end date and starts before this one ends
        validTo: null,
        validFrom: { $lt: this.validTo },
      },
      {
        // Existing assignment has an end date and ranges overlap
        validFrom: { $lt: this.validTo },
        validTo: { $gt: this.validFrom },
      },
    ]
  } else {
    // This assignment has no end date (indefinite)
    overlappingQuery.$or = [
      {
        // Existing assignment has no end date
        validTo: null,
      },
      {
        // Existing assignment has an end date that's after this one starts
        validTo: { $gt: this.validFrom },
      },
    ]
  }

  const overlapping = await EmployeeTeamAssignment.findOne(overlappingQuery)

  if (overlapping) {
    const error = new Error(
      `Employee already has an overlapping assignment for this team at this location. ` +
      `Existing assignment: ${overlapping.validFrom.toISOString()} to ${overlapping.validTo ? overlapping.validTo.toISOString() : "indefinite"}`
    )
    return next(error)
  }

  next()
})

export const EmployeeTeamAssignment =
  (mongoose.models.EmployeeTeamAssignment as mongoose.Model<IEmployeeTeamAssignmentDocument>) ??
  mongoose.model<IEmployeeTeamAssignmentDocument>("EmployeeTeamAssignment", employeeTeamAssignmentSchema)
