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

export interface IRole {
  name: string
  code?: string
  color?: string
  defaultScheduleTemplate?: IDefaultScheduleTemplate
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface IRoleDocument extends IRole, mongoose.Document {}

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

const roleSchema = new mongoose.Schema<IRoleDocument>(
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
    collection: "roles",
  }
)

roleSchema.index({ name: 1 }, { unique: true })

export const Role =
  (mongoose.models.Role as mongoose.Model<IRoleDocument>) ??
  mongoose.model<IRoleDocument>("Role", roleSchema)

