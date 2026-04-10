import mongoose from "mongoose"

export interface IPayItem {
  payRunId: mongoose.Types.ObjectId // ref: PayRun
  employeeId: mongoose.Types.ObjectId // ref: Employee
  sourceShiftId: mongoose.Types.ObjectId // ref: DailyShift - which shift generated this line
  
  type: 'ordinary' | 'overtime' | 'penalty' | 'allowance' | 'leave' | 'public_holiday'
  name: string // e.g. "Saturday Penalty"
  exportName: string // e.g. "SAT 1.25x" (for payroll export)
  
  from: Date // start of pay period or shift
  to: Date // end of pay period or shift
  hours: number
  rate: number
  multiplier: number // 1.0 for ordinary, 1.25 for Saturday, etc
  amount: number // hours * rate * multiplier
  
  // Snapshot frozen at calculation time (if award changes later, this is what applied)
  awardId: mongoose.Types.ObjectId // ref: Award
  awardLevel: string // "level_1", "level_2"
  baseRate: number // frozen rate used
  
  createdAt?: Date
}

export interface IPayItemDocument extends IPayItem, mongoose.Document {}

const payItemSchema = new mongoose.Schema<IPayItemDocument>(
  {
    payRunId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "PayRun", 
      required: true,
      index: true 
    },
    employeeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Employee", 
      required: true,
      index: true 
    },
    sourceShiftId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "DailyShift", 
      required: true,
      index: true 
    },
    type: {
      type: String,
      enum: ['ordinary', 'overtime', 'penalty', 'allowance', 'leave', 'public_holiday'],
      required: true
    },
    name: { type: String, required: true },
    exportName: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    hours: { type: Number, required: true },
    rate: { type: Number, required: true },
    multiplier: { type: Number, required: true },
    amount: { type: Number, required: true },
    awardId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Award", 
      required: true 
    },
    awardLevel: { type: String, required: true },
    baseRate: { type: Number, required: true }
  },
  {
    timestamps: true,
    collection: "pay_items"
  }
)

// Compound indexes for efficient queries
payItemSchema.index({ payRunId: 1, employeeId: 1 })
payItemSchema.index({ employeeId: 1, from: 1 })

export const PayItem =
  (mongoose.models.PayItem as mongoose.Model<IPayItemDocument>) ??
  mongoose.model<IPayItemDocument>("PayItem", payItemSchema)
