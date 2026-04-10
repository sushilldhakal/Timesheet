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
  name: string
  code?: string
  color?: string
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

const teamSchema = new mongoose.Schema<ITeamDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: undefined },
    color: { type: String, default: undefined },
    defaultScheduleTemplate: { type: defaultScheduleTemplateSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "teams",
  }
)

teamSchema.index({ name: 1 }, { unique: true })

export const Team =
  (mongoose.models.Team as mongoose.Model<ITeamDocument>) ??
  mongoose.model<ITeamDocument>("Team", teamSchema)
