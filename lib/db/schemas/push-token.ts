import mongoose from "mongoose"

export type DeviceType = "ios" | "android" | "web"

export interface IPushToken {
  tenantId: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  employeeId?: mongoose.Types.ObjectId
  deviceType: DeviceType
  token: string
  isActive: boolean
  lastUsedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IPushTokenDocument extends IPushToken, mongoose.Document {}

const pushTokenSchema = new mongoose.Schema<IPushTokenDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    deviceType: {
      type: String,
      enum: ["ios", "android", "web"],
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "push_tokens",
  }
)

pushTokenSchema.index({ tenantId: 1, userId: 1, isActive: 1 })
pushTokenSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 })
// token unique index is already defined inline above

export const PushToken =
  (mongoose.models.PushToken as mongoose.Model<IPushTokenDocument>) ??
  mongoose.model<IPushTokenDocument>("PushToken", pushTokenSchema)
