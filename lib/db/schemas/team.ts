import mongoose from "mongoose"

export interface IShiftPattern {
  dayOfWeek?: number[]
  startHour?: number
  endHour?: number
  description?: string
}

export interface IDefaultScheduleTemplate {
  standardHoursPerWeek?: number
  shiftPattern?: IShiftPattern
}

/** Scheduling "team" (job capacity), stored in MongoDB collection `teams`. */
export interface ITeam {
  tenantId: mongoose.Types.ObjectId
  name: string
  code?: string
  color?: string
  groupId?: mongoose.Types.ObjectId
  order?: number
  groupSnapshot?: { name?: string }
  defaultScheduleTemplate?: IDefaultScheduleTemplate
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ITeamDocument extends ITeam, mongoose.Document {}

const shiftPatternSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: [Number] },
    startHour: { type: Number },
    endHour: { type: Number },
    description: { type: String },
  },
  { _id: false }
)

const defaultScheduleTemplateSchema = new mongoose.Schema(
  {
    standardHoursPerWeek: { type: Number },
    shiftPattern: { type: shiftPatternSchema },
  },
  { _id: false }
)

const groupSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
  },
  { _id: false }
)

const teamSchema = new mongoose.Schema<ITeamDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: undefined },
    color: { type: String, default: undefined },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamGroup", default: undefined },
    order: { type: Number, default: 0 },
    groupSnapshot: { type: groupSnapshotSchema, default: undefined },
    defaultScheduleTemplate: { type: defaultScheduleTemplateSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "teams",
  }
)

teamSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export const Team =
  (mongoose.models.Team as mongoose.Model<ITeamDocument>) ??
  mongoose.model<ITeamDocument>("Team", teamSchema)
