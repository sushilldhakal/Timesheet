import mongoose, { Schema, Document } from "mongoose"

export interface IBuddyPunchAlert extends Document {
  employeeId: mongoose.Types.ObjectId
  punchType: "in" | "break" | "endBreak" | "out"
  punchTime: Date
  matchScore: number
  capturedPhotoUrl?: string
  enrolledPhotoUrl?: string
  locationId: mongoose.Types.ObjectId
  deviceId?: string
  deviceName?: string
  status: "pending" | "confirmed_buddy" | "dismissed" | "false_alarm"
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  notes?: string
}

const BuddyPunchAlertSchema = new Schema<IBuddyPunchAlert>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    punchType: {
      type: String,
      enum: ["in", "break", "endBreak", "out"],
      required: true,
    },
    punchTime: {
      type: Date,
      required: true,
      index: true,
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    capturedPhotoUrl: {
      type: String,
    },
    enrolledPhotoUrl: {
      type: String,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    deviceId: {
      type: String,
    },
    deviceName: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed_buddy", "dismissed", "false_alarm"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "buddypunchalerts",
  }
)

// Fast dashboard queries - compound indexes
BuddyPunchAlertSchema.index({ locationId: 1, status: 1, punchTime: -1 })
BuddyPunchAlertSchema.index({ employeeId: 1, punchTime: -1 })
BuddyPunchAlertSchema.index({ status: 1, punchTime: -1 })

export const BuddyPunchAlert =
  (mongoose.models.BuddyPunchAlert as mongoose.Model<IBuddyPunchAlert>) ??
  mongoose.model<IBuddyPunchAlert>("BuddyPunchAlert", BuddyPunchAlertSchema)
