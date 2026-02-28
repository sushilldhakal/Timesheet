import mongoose from "mongoose"

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "error", "warning"],
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "storage",
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
activityLogSchema.index({ userId: 1, createdAt: -1 })
activityLogSchema.index({ category: 1, createdAt: -1 })

export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema)
