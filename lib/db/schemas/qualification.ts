import mongoose from "mongoose"

export interface IQualification {
  tenantId: mongoose.Types.ObjectId
  name: string
  description?: string
  /** Optional cap for hours that can be assigned/credited. */
  maxHours?: number
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface IQualificationDocument extends IQualification, mongoose.Document {}

const qualificationSchema = new mongoose.Schema<IQualificationDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: undefined },
    maxHours: {
      type: Number,
      default: undefined,
      min: 0,
      validate: {
        validator: (v: unknown) =>
          v === undefined || v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0),
        message: "maxHours must be a finite number >= 0",
      },
    },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "qualifications",
  }
)

qualificationSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export const Qualification =
  (mongoose.models.Qualification as mongoose.Model<IQualificationDocument>) ??
  mongoose.model<IQualificationDocument>("Qualification", qualificationSchema)

export default Qualification

