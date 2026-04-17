import mongoose from "mongoose"

export type ClockEventType = "clock_in" | "break_start" | "break_end" | "clock_out"

export interface IClockAudit {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  sessionId: mongoose.Types.ObjectId
  shiftId?: mongoose.Types.ObjectId
  eventType: ClockEventType
  gpsLat?: number
  gpsLng?: number
  distanceFromLocation?: number
  ipAddress?: string
  deviceFingerprint?: string
  userAgent?: string
  riskScore: number
  riskFlags: string[]
  rawPayload?: Record<string, unknown>
  recordedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IClockAuditDocument extends IClockAudit, mongoose.Document {}

const clockAuditSchema = new mongoose.Schema<IClockAuditDocument>(
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClockSession",
      required: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyShift",
    },
    eventType: {
      type: String,
      enum: ["clock_in", "break_start", "break_end", "clock_out"],
      required: true,
    },
    gpsLat: { type: Number },
    gpsLng: { type: Number },
    distanceFromLocation: { type: Number },
    ipAddress: { type: String },
    deviceFingerprint: { type: String },
    userAgent: { type: String },
    riskScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    riskFlags: {
      type: [String],
      default: [],
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "clock_audits",
  }
)

clockAuditSchema.index({ tenantId: 1, employeeId: 1, recordedAt: -1 })
clockAuditSchema.index({ tenantId: 1, sessionId: 1 })
clockAuditSchema.index({ tenantId: 1, riskScore: -1 })

export const ClockAudit =
  (mongoose.models.ClockAudit as mongoose.Model<IClockAuditDocument>) ??
  mongoose.model<IClockAuditDocument>("ClockAudit", clockAuditSchema)
