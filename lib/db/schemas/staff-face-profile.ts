import mongoose, { Schema, Document } from "mongoose"

export interface IStaffFaceProfile extends Document {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  descriptor: number[]
  enrolledAt: Date
  enrolledBy: "auto" | "admin"
  enrollmentQuality: number
  enrolledPhotoUrl?: string
  lastMatchedAt?: Date
  lastMatchScore?: number
  isActive: boolean
}

const StaffFaceProfileSchema = new Schema<IStaffFaceProfile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    descriptor: {
      type: [Number],
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    enrolledBy: {
      type: String,
      enum: ["auto", "admin"],
      default: "auto",
    },
    enrollmentQuality: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    enrolledPhotoUrl: {
      type: String,
    },
    lastMatchedAt: {
      type: Date,
    },
    lastMatchScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "stafffaceprofiles",
  }
)

// Index for efficient queries
StaffFaceProfileSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true })
StaffFaceProfileSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 })

export const StaffFaceProfile =
  (mongoose.models.StaffFaceProfile as mongoose.Model<IStaffFaceProfile>) ??
  mongoose.model<IStaffFaceProfile>("StaffFaceProfile", StaffFaceProfileSchema)
