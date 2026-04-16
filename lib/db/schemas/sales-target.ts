import mongoose from "mongoose"

export interface ISalesTarget {
  tenantId: mongoose.Types.ObjectId
  /** Target date (typically start-of-day in tenant timezone). */
  date: Date
  /** Back-compat stored field (use `target` in new code). */
  targetAmount: number
  /** Alias for `targetAmount` (preferred). */
  target?: number
  /** Whether target was entered manually (Tanda parity). */
  userEntered?: boolean
  currency?: string
  notes?: string
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ISalesTargetDocument extends ISalesTarget, mongoose.Document {}

const salesTargetSchema = new mongoose.Schema<ISalesTargetDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    date: { type: Date, required: true, index: true },
    targetAmount: { type: Number, required: true, min: 0, alias: "target" },
    userEntered: { type: Boolean, default: false },
    currency: { type: String, default: "AUD" },
    notes: { type: String, default: undefined },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "sales_targets",
  }
)

salesTargetSchema.index({ tenantId: 1, date: 1 }, { unique: true })

export const SalesTarget =
  (mongoose.models.SalesTarget as mongoose.Model<ISalesTargetDocument>) ??
  mongoose.model<ISalesTargetDocument>("SalesTarget", salesTargetSchema)

export default SalesTarget

