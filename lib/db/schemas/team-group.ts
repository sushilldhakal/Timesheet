import mongoose from "mongoose"

/** Kitchen/Team grouping for organizational hierarchy */
export interface ITeamGroup {
  tenantId: mongoose.Types.ObjectId
  name: string
  description?: string
  color?: string
  order?: number
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface ITeamGroupDocument extends ITeamGroup, mongoose.Document {}

const teamGroupSchema = new mongoose.Schema<ITeamGroupDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: undefined },
    color: { type: String, default: undefined },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    collection: "team_groups",
  }
)

teamGroupSchema.index({ tenantId: 1, name: 1 }, { unique: true })
teamGroupSchema.index({ isActive: 1, name: 1 })

export const TeamGroup =
  (mongoose.models.TeamGroup as mongoose.Model<ITeamGroupDocument>) ??
  mongoose.model<ITeamGroupDocument>("TeamGroup", teamGroupSchema)
