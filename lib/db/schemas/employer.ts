import mongoose from "mongoose"

export interface IEmployer {
  name: string
  abn?: string
  contactEmail?: string
  color?: string
  defaultAwardId?: mongoose.Types.ObjectId
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployerDocument extends IEmployer, mongoose.Document {}

const employerSchema = new mongoose.Schema<IEmployerDocument>(
  {
    name: { type: String, required: true, trim: true },
    abn: { type: String, trim: true, default: undefined },
    contactEmail: { type: String, trim: true, lowercase: true, default: undefined },
    color: { type: String, default: undefined },
    defaultAwardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", default: undefined },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "employers",
  }
)

employerSchema.index({ name: 1 }, { unique: true })

export const Employer =
  (mongoose.models.Employer as mongoose.Model<IEmployerDocument>) ??
  mongoose.model<IEmployerDocument>("Employer", employerSchema)

