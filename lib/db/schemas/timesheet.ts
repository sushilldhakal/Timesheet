import mongoose from "mongoose"

/** Set by admin when editing timesheet: "insert" = time was added (was empty), "update" = time was changed (had value). Device punches leave this unset. */
export type TimesheetSource = "insert" | "update"

/** Break source tracking for audit purposes */
export type BreakSource = "punched" | "auto_rule" | "none"

export interface ITimesheet {
  pin: string
  type: string // in, out, break, endBreak
  date: string
  time?: string
  image?: string
  lat?: string
  lng?: string
  where?: string
  flag?: boolean
  working?: string
  source?: TimesheetSource
  deviceId?: string // Device that recorded this entry
  deviceLocation?: string // Location name at time of entry
  breakSource?: BreakSource // Where the break calculation came from
  breakRuleRef?: string // Label of the break rule that was applied
}

export interface ITimesheetDocument extends ITimesheet, mongoose.Document {}

const timesheetSchema = new mongoose.Schema<ITimesheetDocument>(
  {
    pin: { type: String, required: true },
    type: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, default: "" },
    image: { type: String, default: "" },
    lat: { type: String, default: "" },
    lng: { type: String, default: "" },
    where: { type: String, default: "" },
    flag: { type: Boolean, default: false },
    working: { type: String, default: "" },
    source: { type: String, default: "" },
    deviceId: { type: String, default: "" },
    deviceLocation: { type: String, default: "" },
    breakSource: { type: String, enum: ["punched", "auto_rule", "none"], default: "none" },
    breakRuleRef: { type: String, default: "" },
  },
  {
    timestamps: false,
    collection: "timesheets",
  }
)

timesheetSchema.index({ pin: 1, date: 1 })

export const Timesheet =
  (mongoose.models.Timesheet as mongoose.Model<ITimesheetDocument>) ??
  mongoose.model<ITimesheetDocument>("Timesheet", timesheetSchema)
