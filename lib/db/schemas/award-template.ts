import mongoose from "mongoose"

export interface IAwardTemplate {
  tenantId: mongoose.Types.ObjectId
  /** String org identifier (Tanda-ish). Back-compat: typically `String(tenantId)`. */
  organizationId?: string
  name: string
  description?: string
  awardId?: mongoose.Types.ObjectId
  baseRules?: unknown[]
  isDefault?: boolean
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface IAwardTemplateDocument extends IAwardTemplate, mongoose.Document {}

const awardTemplateSchema = new mongoose.Schema<IAwardTemplateDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    organizationId: { type: String, default: undefined, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: undefined },
    awardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", default: undefined, index: true },
    baseRules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "award_templates",
  }
)

awardTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true })
awardTemplateSchema.index({ organizationId: 1, name: 1 }, { unique: true, sparse: true })

export const AwardTemplate =
  (mongoose.models.AwardTemplate as mongoose.Model<IAwardTemplateDocument>) ??
  mongoose.model<IAwardTemplateDocument>("AwardTemplate", awardTemplateSchema)

export default AwardTemplate

