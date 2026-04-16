import mongoose from "mongoose"

export interface ICustomEventTeam {
  tenantId: mongoose.Types.ObjectId
  customEventId: mongoose.Types.ObjectId
  teamId: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ICustomEventTeamDocument extends ICustomEventTeam, mongoose.Document {}

const customEventTeamSchema = new mongoose.Schema<ICustomEventTeamDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    customEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomEvent",
      required: true,
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  },
  {
    timestamps: true,
    collection: "custom_event_teams",
  }
)

customEventTeamSchema.index({ tenantId: 1, customEventId: 1, teamId: 1 }, { unique: true })

export const CustomEventTeam =
  (mongoose.models.CustomEventTeam as mongoose.Model<ICustomEventTeamDocument>) ??
  mongoose.model<ICustomEventTeamDocument>("CustomEventTeam", customEventTeamSchema)

export default CustomEventTeam

