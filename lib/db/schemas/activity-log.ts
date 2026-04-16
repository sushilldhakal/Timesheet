import mongoose from "mongoose"

const activityLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
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
activityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })
activityLogSchema.index({ tenantId: 1, category: 1, createdAt: -1 })

export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema)
