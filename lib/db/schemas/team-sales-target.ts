import mongoose from "mongoose"

export interface ITeamSalesTarget {
  tenantId: mongoose.Types.ObjectId
  teamId: mongoose.Types.ObjectId
  /** Target date (typically start-of-day in tenant timezone). */
  date: Date
  /** Back-compat stored field (use `target` in new code). */
  targetAmount: number
  /** Alias for `targetAmount` (preferred). */
  target?: number
  currency?: string
  notes?: string
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ITeamSalesTargetDocument extends ITeamSalesTarget, mongoose.Document {}

const teamSalesTargetSchema = new mongoose.Schema<ITeamSalesTargetDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    date: { type: Date, required: true, index: true },
    targetAmount: { type: Number, required: true, min: 0, alias: "target" },
    currency: { type: String, default: "AUD" },
    notes: { type: String, default: undefined },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "team_sales_targets",
  }
)

teamSalesTargetSchema.index({ tenantId: 1, teamId: 1, date: 1 }, { unique: true })

export const TeamSalesTarget =
  (mongoose.models.TeamSalesTarget as mongoose.Model<ITeamSalesTargetDocument>) ??
  mongoose.model<ITeamSalesTargetDocument>("TeamSalesTarget", teamSalesTargetSchema)

export default TeamSalesTarget

