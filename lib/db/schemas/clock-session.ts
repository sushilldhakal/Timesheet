import mongoose from "mongoose"

export interface IClockSession {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  deviceId: mongoose.Types.ObjectId
  shiftId?: mongoose.Types.ObjectId
  loginTime: Date
  logoutTime?: Date
  isActive: boolean
  pin: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IClockSessionDocument extends IClockSession, mongoose.Document {}

const clockSessionSchema = new mongoose.Schema<IClockSessionDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyShift",
    },
    loginTime: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    logoutTime: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    pin: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "clock_sessions",
  }
)

// Partial unique index: only one active session per employee per tenant
clockSessionSchema.index(
  { tenantId: 1, employeeId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
)
clockSessionSchema.index({ tenantId: 1, deviceId: 1, isActive: 1 })
clockSessionSchema.index({ tenantId: 1, loginTime: -1 })

export const ClockSession =
  (mongoose.models.ClockSession as mongoose.Model<IClockSessionDocument>) ??
  mongoose.model<IClockSessionDocument>("ClockSession", clockSessionSchema)
