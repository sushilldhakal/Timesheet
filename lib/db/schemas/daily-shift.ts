import mongoose from "mongoose"

export interface IClockEvent {
  time: string
  image?: string
  lat?: string
  lng?: string
  flag: boolean
}

export interface IDailyShift {
  pin: string
  date: string // "dd-MM-yyyy" format
  clockIn?: IClockEvent
  breakIn?: IClockEvent
  breakOut?: IClockEvent
  clockOut?: IClockEvent
  totalBreakMinutes?: number
  totalWorkingHours?: number
  source: "clock" | "manual" | "leave"
  status: "active" | "completed" | "approved" | "rejected"
  createdAt?: Date
  updatedAt?: Date
}

export interface IDailyShiftDocument extends IDailyShift, mongoose.Document {}

const clockEventSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    image: { type: String },
    lat: { type: String },
    lng: { type: String },
    flag: { type: Boolean, default: false },
  },
  { _id: false }
)

const dailyShiftSchema = new mongoose.Schema<IDailyShiftDocument>(
  {
    pin: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    clockIn: { type: clockEventSchema },
    breakIn: { type: clockEventSchema },
    breakOut: { type: clockEventSchema },
    clockOut: { type: clockEventSchema },
    totalBreakMinutes: { type: Number, default: 0 },
    totalWorkingHours: { type: Number },
    source: {
      type: String,
      enum: ["clock", "manual", "leave"],
      default: "clock",
    },
    status: {
      type: String,
      enum: ["active", "completed", "approved", "rejected"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "daily_shifts",
  }
)

// Unique constraint on pin + date
dailyShiftSchema.index({ pin: 1, date: 1 }, { unique: true })

export const DailyShift =
  (mongoose.models.DailyShift as mongoose.Model<IDailyShiftDocument>) ??
  mongoose.model<IDailyShiftDocument>("DailyShift", dailyShiftSchema)
