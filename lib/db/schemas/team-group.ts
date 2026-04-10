import mongoose from "mongoose"

/** Kitchen/Team grouping for organizational hierarchy */
export interface ITeamGroup {
  name: string
  description?: string
  color?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface ITeamGroupDocument extends ITeamGroup, mongoose.Document {}

const teamGroupSchema = new mongoose.Schema<ITeamGroupDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, trim: true, default: undefined },
    color: { type: String, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    collection: "team_groups",
  }
)

// Compound index for active groups with name search
teamGroupSchema.index({ isActive: 1, name: 1 })

export const TeamGroup =
  (mongoose.models.TeamGroup as mongoose.Model<ITeamGroupDocument>) ??
  mongoose.model<ITeamGroupDocument>("TeamGroup", teamGroupSchema)
