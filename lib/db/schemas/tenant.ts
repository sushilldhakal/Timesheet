import mongoose from "mongoose"

/**
 * Tenant Interface
 * Represents an organization or account in the multi-tenant system
 * Each tenant has isolated data and independent rate limiting
 */
export interface ITenant {
  name: string // Organization name
  slug: string // URL-friendly identifier (unique)
  isActive: boolean // Whether the tenant is active
  createdAt: number // Unix timestamp (seconds)
  updatedAt: number // Unix timestamp (seconds)
}

export interface ITenantDocument extends ITenant, mongoose.Document {}

const tenantSchema = new mongoose.Schema<ITenantDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Number,
      required: true,
    },
    updatedAt: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false, // We manage timestamps manually as Unix seconds
    collection: "tenants",
  }
)

// Pre-save hook to set Unix timestamps
tenantSchema.pre("save", function (next) {
  const now = Math.floor(Date.now() / 1000)
  if (this.isNew) {
    this.createdAt = now
  }
  this.updatedAt = now
  next()
})

export const Tenant =
  (mongoose.models.Tenant as mongoose.Model<ITenantDocument>) ??
  mongoose.model<ITenantDocument>("Tenant", tenantSchema)
