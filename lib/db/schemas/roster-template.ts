import mongoose from "mongoose"

export interface ITemplateShift {
  dayOfWeek: number // 0–6 (Sun–Sat)
  startHour: number
  endHour: number
  roleId: mongoose.Types.ObjectId
  employeeId?: mongoose.Types.ObjectId | null
}

export interface IRosterTemplate {
  _id: mongoose.Types.ObjectId
  name: string
  createdBy: mongoose.Types.ObjectId
  locationId: mongoose.Types.ObjectId
  roleIds: mongoose.Types.ObjectId[]
  isGlobal: boolean
  templateShifts: ITemplateShift[]
  createdAt: Date
  updatedAt: Date
}

export interface IRosterTemplateDocument extends IRosterTemplate, mongoose.Document {}

const TemplateShiftSchema = new mongoose.Schema<ITemplateShift>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startHour: { type: Number, required: true },
    endHour: { type: Number, required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  },
  { _id: false }
)

const rosterTemplateSchema = new mongoose.Schema<IRosterTemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    isGlobal: { type: Boolean, default: false },
    templateShifts: { type: [TemplateShiftSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "roster_templates",
  }
)

rosterTemplateSchema.index({ createdBy: 1, locationId: 1 })
rosterTemplateSchema.index({ isGlobal: 1 })

export const RosterTemplate =
  (mongoose.models.RosterTemplate as mongoose.Model<IRosterTemplateDocument>) ??
  mongoose.model<IRosterTemplateDocument>("RosterTemplate", rosterTemplateSchema)
