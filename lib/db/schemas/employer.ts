import mongoose from "mongoose"

export type EmployerPlan = "free" | "starter" | "pro" | "enterprise"

export interface IPayPeriodConfig {
  windowType: 'weekly' | 'fortnightly' | 'roster_cycle' | 'rolling_days'
  periodStartDayOfWeek?: number
  rosterCycleDays?: number
  rollingDays?: number
}

export interface IEmployer {
  name: string
  abn?: string
  contactEmail?: string
  color?: string
  defaultAwardId?: mongoose.Types.ObjectId
  slug?: string
  plan?: EmployerPlan
  timezone?: string
  logoUrl?: string
  inviteCode?: string
  isActive: boolean
  payPeriodConfig?: IPayPeriodConfig
  /** When true, the Employers section is shown in nav for managing external/agency staff */
  enableExternalHire?: boolean
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
    enableExternalHire: { type: Boolean, default: false },
    payPeriodConfig: {
      windowType: {
        type: String,
        enum: ['weekly', 'fortnightly', 'roster_cycle', 'rolling_days'],
        default: 'weekly',
      },
      periodStartDayOfWeek: { type: Number, default: 1 },
      rosterCycleDays: { type: Number },
      rollingDays: { type: Number },
    },
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

