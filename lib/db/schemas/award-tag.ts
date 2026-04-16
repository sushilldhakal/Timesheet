import mongoose from "mongoose"

export interface IAwardTagMaster {
  tenantId: mongoose.Types.ObjectId
  /**
   * String org identifier (Tanda-ish). Back-compat: typically `String(tenantId)`.
   * Kept optional to avoid a breaking migration; populated by migration/new writes.
   */
  organizationId?: string
  name: string
  description?: string
  color?: string
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface IAwardTagMasterDocument extends IAwardTagMaster, mongoose.Document {}

const awardTagSchema = new mongoose.Schema<IAwardTagMasterDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    organizationId: { type: String, default: undefined, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: undefined },
    color: { type: String, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "award_tags",
  }
)

awardTagSchema.index({ tenantId: 1, name: 1 }, { unique: true })
awardTagSchema.index({ tenantId: 1, isActive: 1, name: 1 })
awardTagSchema.index({ organizationId: 1, isActive: 1, name: 1 }, { sparse: true })
awardTagSchema.index({ organizationId: 1, name: 1 }, { unique: true, sparse: true })

export const AwardTag =
  (mongoose.models.AwardTag as mongoose.Model<IAwardTagMasterDocument>) ??
  mongoose.model<IAwardTagMasterDocument>("AwardTag", awardTagSchema)

export default AwardTag

