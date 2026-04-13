import mongoose from "mongoose"

export interface IPayRun {
  tenantId: mongoose.Types.ObjectId // ref: Employer
  startDate: Date
  endDate: Date
  status: 'draft' | 'calculated' | 'approved' | 'exported' | 'failed'
  createdBy: mongoose.Types.ObjectId // ref: User
  approvedBy?: mongoose.Types.ObjectId // ref: User
  approvedAt?: Date
  exportedAt?: Date
  exportType?: 'xero' | 'myob' | 'apa' | 'custom'
  exportReference?: string
  exportedBy?: mongoose.Types.ObjectId
  jobError?: string
  totals: {
    gross: number
    tax: number
    super: number
    net: number
    totalHours: number
    employeeCount: number
  }
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IPayRunDocument extends IPayRun, mongoose.Document {}

const payRunSchema = new mongoose.Schema<IPayRunDocument>(
  {
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Employer", 
      required: true,
      index: true 
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'calculated', 'approved', 'exported', 'failed'],
      default: 'draft',
      required: true,
      index: true
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    approvedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    approvedAt: { type: Date },
    exportedAt: { type: Date },
    exportType: {
      type: String,
      enum: ['xero', 'myob', 'apa', 'custom']
    },
    exportReference: { type: String },
    exportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    jobError: { type: String },
    totals: {
      gross: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      super: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      employeeCount: { type: Number, default: 0 }
    },
    notes: { type: String }
  },
  {
    timestamps: true,
    collection: "pay_runs"
  }
)

// Compound indexes for efficient queries
payRunSchema.index({ tenantId: 1, status: 1 })
payRunSchema.index({ tenantId: 1, startDate: 1, endDate: 1 })

export const PayRun =
  (mongoose.models.PayRun as mongoose.Model<IPayRunDocument>) ??
  mongoose.model<IPayRunDocument>("PayRun", payRunSchema)
