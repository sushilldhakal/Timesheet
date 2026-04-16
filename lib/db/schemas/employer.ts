import mongoose from "mongoose"

export type EmployerPlan = "free" | "starter" | "pro" | "enterprise"

export interface IEmployer {
  name: string
  abn?: string
  contactEmail?: string
  color?: string
  defaultAwardId?: mongoose.Types.ObjectId
  /** URL-safe unique identifier (backfilled via migration). */
  slug?: string
  plan?: EmployerPlan
  timezone?: string
  logoUrl?: string
  /** Optional invite code for onboarding. */
  inviteCode?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployerDocument extends IEmployer, mongoose.Document {}

const employerSchema = new mongoose.Schema<IEmployerDocument>(
  {
    name: { type: String, required: true, trim: true },
    abn: { type: String, trim: true, default: undefined },
    contactEmail: { type: String, trim: true, lowercase: true, default: undefined },
    color: { type: String, default: undefined },
    defaultAwardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", default: undefined },
    slug: { type: String, trim: true, lowercase: true, default: undefined },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    timezone: { type: String, default: "Australia/Sydney" },
    logoUrl: { type: String, default: undefined },
    inviteCode: { type: String, trim: true, default: undefined },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "employers",
  }
)

employerSchema.index({ name: 1 }, { unique: true })
// Note: sparse keeps this backwards-compatible until backfill completes.
employerSchema.index({ slug: 1 }, { unique: true, sparse: true })
employerSchema.index({ inviteCode: 1 }, { unique: true, sparse: true })

export const Employer =
  (mongoose.models.Employer as mongoose.Model<IEmployerDocument>) ??
  mongoose.model<IEmployerDocument>("Employer", employerSchema)

