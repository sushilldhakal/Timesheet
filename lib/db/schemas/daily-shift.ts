import mongoose from "mongoose"

export interface IClockEvent {
  time: Date // Native Date object in UTC
  image?: string
  lat?: number // Number for geospatial queries
  lng?: number // Number for geospatial queries
  flag: boolean
  deviceId?: string
  deviceLocation?: string
}

export interface IShiftBreak {
  startTime: Date
  endTime: Date
  isPaid: boolean
  source: 'clocked' | 'automatic'
}

// Pay line item for award calculation (Tanda-style)
export interface IPayLineItem {
  units: number // Hours worked for this line item
  from: Date // Start time of this segment
  to: Date // End time of this segment
  name: string // Human readable name (e.g. "Daily Overtime")
  exportName: string // Export code for payroll (e.g. "OT 1.5x")
  ordinaryHours: number // Ordinary hours component
  cost: number // Dollar amount (units * rate * multiplier)
  baseRate: number // Base hourly rate used
  multiplier?: number // Rate multiplier (1.5, 2.0, etc.)
  ruleId?: string // Which rule generated this line
}

// Computed pay breakdown (updated structure)
export interface IComputedPay {
  payLines: IPayLineItem[] // Per-line-item output matching Tanda
  totalCost: number // Sum of all line item costs
  totalHours: number // Sum of all line item units
  // Frozen pay snapshot fields (audit trail)
  awardId?: mongoose.Types.ObjectId // which award was used
  awardLevel?: string // "level_1", frozen at calculation
  baseRate?: number // hourly rate frozen at calculation time
  calculatedAt?: Date // when this was computed
  payRunId?: mongoose.Types.ObjectId // which pay run includes this shift
  // Award version tracking (audit-critical)
  awardVersion?: string // e.g. "1.2.0"
  awardVersionId?: mongoose.Types.ObjectId // ref to AwardVersionHistory if historical
  awardVersionEffectiveFrom?: Date // when that version became effective
  breakEntitlements: Array<{
    startTime: Date
    durationMinutes: number
    isPaid: boolean
    name: string
    exportName: string
  }>
  leaveAccruals: Array<{
    type: string
    hoursAccrued: number
    exportName: string
  }>
  lastCalculated: Date
}

// Pay snapshot for historical accuracy
export interface IPaySnapshot {
  awardId: mongoose.Types.ObjectId
  awardLevel: string
  baseRate: number
  calculatedAt: Date
  payRunId?: mongoose.Types.ObjectId // set when included in a PayRun
}

export interface IDailyShift {
  tenantId: mongoose.Types.ObjectId
  pin: string
  date: Date // BSON Date object for consistent querying and storage
  
  // Context fields for scoped access
  locationId: mongoose.Types.ObjectId | null // ref: Location
  roleId: mongoose.Types.ObjectId | null // ref: Team
  employerId?: mongoose.Types.ObjectId | null // ref: Employer
  employeeId: mongoose.Types.ObjectId | null // Reference to Employee document
  rosterShiftId?: mongoose.Types.ObjectId // ref: 'Roster' shift subdocument
  
  clockIn?: IClockEvent
  breakIn?: IClockEvent
  breakOut?: IClockEvent
  breaks?: IShiftBreak[]
  clockOut?: IClockEvent
  totalBreakMinutes?: number
  totalWorkingHours?: number
  source: "clock" | "manual" | "leave"
  
  // 🔥 CRITICAL: Award Tags (Manual Overrides)
  awardTags: string[] // e.g., ['TOIL', 'BrokenShift', 'PublicHolidayOverride']
  
  // 🔥 CRITICAL: Computed Pay Breakdown (Award Engine Results)
  computed?: IComputedPay
  
  // Pay snapshot for historical accuracy
  paySnapshot?: IPaySnapshot
  
  // Enhanced status workflow: active → completed → approved → locked → processed → exported
  status: "active" | "completed" | "approved" | "locked" | "processed" | "exported" | "rejected"
  
  // Approval workflow
  approvedBy: mongoose.Types.ObjectId | null // Reference to User who approved
  approvedAt: Date | null
  
  // Lock workflow (prevents operational edits)
  lockedBy: mongoose.Types.ObjectId | null // Reference to User who locked
  lockedAt: Date | null
  
  // Payroll processing
  processedBy: mongoose.Types.ObjectId | null // Reference to User who processed
  processedAt: Date | null
  exportedAt: Date | null
  exportReference: string | null // Xero/MYOB reference ID
  
  createdAt?: Date
  updatedAt?: Date
}

export interface IDailyShiftDocument extends IDailyShift, mongoose.Document {}

const clockEventSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true }, // Native Date for calculations
    image: { type: String },
    lat: { type: Number }, // Number for geospatial queries
    lng: { type: Number }, // Number for geospatial queries
    flag: { type: Boolean, default: false },
    deviceId: { type: String },
    deviceLocation: { type: String },
  },
  { _id: false }
)

const shiftBreakSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isPaid: { type: Boolean, required: true, default: false },
    source: { type: String, enum: ['clocked', 'automatic'], required: true, default: 'clocked' },
  },
  { _id: false }
)

const payLineItemSchema = new mongoose.Schema(
  {
    units: { type: Number, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    name: { type: String, required: true },
    exportName: { type: String, required: true },
    ordinaryHours: { type: Number, required: true },
    cost: { type: Number, required: true },
    baseRate: { type: Number, required: true },
    multiplier: { type: Number },
    ruleId: { type: String },
  },
  { _id: false }
)

const computedPaySchema = new mongoose.Schema(
  {
    payLines: [payLineItemSchema],
    totalCost: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    // Frozen pay snapshot fields (optional; no migration required)
    awardId: { type: mongoose.Schema.Types.ObjectId },
    awardLevel: { type: String },
    baseRate: { type: Number },
    calculatedAt: { type: Date },
    payRunId: { type: mongoose.Schema.Types.ObjectId, ref: "PayRun" },
    awardVersion: { type: String },
    awardVersionId: { type: mongoose.Schema.Types.ObjectId },
    awardVersionEffectiveFrom: { type: Date },
    breakEntitlements: [{
      startTime: { type: Date, required: true },
      durationMinutes: { type: Number, required: true },
      isPaid: { type: Boolean, required: true },
      name: { type: String, required: true },
      exportName: { type: String, required: true },
    }],
    leaveAccruals: [{
      type: { type: String, required: true },
      hoursAccrued: { type: Number, required: true },
      exportName: { type: String, required: true },
    }],
    lastCalculated: { type: Date, default: Date.now },
  },
  { _id: false }
)

const paySnapshotSchema = new mongoose.Schema(
  {
    awardId: { type: mongoose.Schema.Types.ObjectId, required: true },
    awardLevel: { type: String, required: true },
    baseRate: { type: Number, required: true },
    calculatedAt: { type: Date, required: true },
    payRunId: { type: mongoose.Schema.Types.ObjectId, ref: "PayRun" }
  },
  { _id: false }
)

const dailyShiftSchema = new mongoose.Schema<IDailyShiftDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    pin: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true }, // BSON Date for efficient querying
    
    // Context fields for scoped access
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", default: null },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", default: null },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null }, // Reference to Employee document
    rosterShiftId: { type: mongoose.Schema.Types.ObjectId }, // ref: 'Roster' shift subdocument
    
    clockIn: { type: clockEventSchema },
    breakIn: { type: clockEventSchema },
    breakOut: { type: clockEventSchema },
    breaks: { type: [shiftBreakSchema], default: [] },
    clockOut: { type: clockEventSchema },
    totalBreakMinutes: { type: Number, default: 0 },
    totalWorkingHours: { type: Number },
    source: {
      type: String,
      enum: ["clock", "manual", "leave"],
      default: "clock",
    },
    
    // 🔥 Award Tags (Manual Overrides)
    awardTags: [{
      type: String,
      enum: ['TOIL', 'BrokenShift', 'PublicHolidayOverride', 'ReturnToDuty', 'SickLeave', 'AnnualLeave']
    }],
    
    // 🔥 Computed Pay Breakdown
    computed: { type: computedPaySchema },
    
    // Pay snapshot for historical accuracy
    paySnapshot: { type: paySnapshotSchema },
    
    status: {
      type: String,
      enum: ["active", "completed", "approved", "locked", "processed", "exported", "rejected"],
      default: "active",
    },
    
    // Approval workflow
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    
    // Lock workflow (prevents operational edits)
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lockedAt: { type: Date, default: null },
    
    // Payroll processing
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    processedAt: { type: Date, default: null },
    exportedAt: { type: Date, default: null },
    exportReference: { type: String, default: null }, // Xero/MYOB reference ID
  },
  {
    timestamps: true,
    collection: "daily_shifts",
  }
)

// Tenant-scoped unique constraint on pin + date
dailyShiftSchema.index({ tenantId: 1, pin: 1, date: 1 }, { unique: true })

// Compound indexes for scoped queries
dailyShiftSchema.index({ tenantId: 1, employeeId: 1, date: 1 })
dailyShiftSchema.index({ tenantId: 1, locationId: 1, date: 1 })
dailyShiftSchema.index({ tenantId: 1, locationId: 1, status: 1, date: 1 })
dailyShiftSchema.index({ tenantId: 1, locationId: 1, roleId: 1, status: 1 })
dailyShiftSchema.index({ employerId: 1, status: 1, date: 1 })
dailyShiftSchema.index({ employeeId: 1, date: 1 })

// Index for award tags
dailyShiftSchema.index({ awardTags: 1 })

// Index for roster shift reference
dailyShiftSchema.index({ rosterShiftId: 1 }, { sparse: true })

export const DailyShift =
  (mongoose.models.DailyShift as mongoose.Model<IDailyShiftDocument>) ??
  mongoose.model<IDailyShiftDocument>("DailyShift", dailyShiftSchema)
