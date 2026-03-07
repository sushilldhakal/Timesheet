import mongoose, { Schema, Document } from "mongoose"

export interface IStaffFaceProfile extends Document {
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
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
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
StaffFaceProfileSchema.index({ employeeId: 1, isActive: 1 })

export const StaffFaceProfile =
  (mongoose.models.StaffFaceProfile as mongoose.Model<IStaffFaceProfile>) ??
  mongoose.model<IStaffFaceProfile>("StaffFaceProfile", StaffFaceProfileSchema)
