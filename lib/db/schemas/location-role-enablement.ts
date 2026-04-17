import mongoose from "mongoose"

/**
 * Tracks which roles are enabled at which locations
 * Junction table between Location and Team (scheduling capacity)
 */
export interface ILocationRoleEnablement {
  tenantId: mongoose.Types.ObjectId   // ref: Employer
  locationId: mongoose.Types.ObjectId  // ref: Location
  roleId: mongoose.Types.ObjectId      // ref: Team
  effectiveFrom: Date                  // When this enablement starts
  effectiveTo: Date | null             // When this enablement ends (null = indefinite)
  isActive: boolean                    // Computed: current date within range
  createdBy: mongoose.Types.ObjectId   // ref: User (admin who enabled)
  createdAt?: Date
  updatedAt?: Date
}

export interface ILocationRoleEnablementDocument extends ILocationRoleEnablement, mongoose.Document {}

const locationRoleEnablementSchema = new mongoose.Schema<ILocationRoleEnablementDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
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
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "location_role_enablements",
  }
)

// Compound indexes for query performance
// Unique index scoped per tenant — prevents duplicate enablements for the same role/location/date within a tenant
locationRoleEnablementSchema.index(
  { tenantId: 1, locationId: 1, roleId: 1, effectiveFrom: 1 },
  { unique: true }
)

// Index for getting active roles for a location
locationRoleEnablementSchema.index({ tenantId: 1, locationId: 1, isActive: 1 })

// Index for getting locations where a role is enabled
locationRoleEnablementSchema.index({ tenantId: 1, roleId: 1, isActive: 1 })

// Pre-save hook to compute isActive field
locationRoleEnablementSchema.pre("save", function (next) {
  const now = new Date()
  const isWithinRange = this.effectiveFrom <= now && (!this.effectiveTo || this.effectiveTo >= now)
  this.isActive = isWithinRange
  next()
})

export const LocationRoleEnablement =
  (mongoose.models.LocationRoleEnablement as mongoose.Model<ILocationRoleEnablementDocument>) ??
  mongoose.model<ILocationRoleEnablementDocument>("LocationRoleEnablement", locationRoleEnablementSchema)
