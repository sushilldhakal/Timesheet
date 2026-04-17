import mongoose from "mongoose"

export type ExportSystem = "xero" | "myob" | "apa" | "custom"
export type ExportStatus = "pending" | "processing" | "success" | "failed" | "partial"

export interface IPayrollExport {
  tenantId: mongoose.Types.ObjectId
  payRunId: mongoose.Types.ObjectId
  exportSystem: ExportSystem
  status: ExportStatus
  exportedAt?: Date
  exportedBy: mongoose.Types.ObjectId
  exportPayload: Record<string, unknown>
  responsePayload?: Record<string, unknown>
  errorLog?: string
  retryCount: number
  externalRef?: string
  rowCount: number
  // Per-employee tracking
  employeeResults?: Array<{
    employeeId: mongoose.Types.ObjectId
    status: 'pending' | 'exported' | 'failed'
    error?: string
    exportedAt?: Date
    retryCount: number
  }>
  lastAttemptAt?: Date
  nextRetryAt?: Date
  maxRetries: number
  createdAt?: Date
  updatedAt?: Date
}

export interface IPayrollExportDocument extends IPayrollExport, mongoose.Document {}

const payrollExportSchema = new mongoose.Schema<IPayrollExportDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    payRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayRun",
      required: true,
    },
    exportSystem: {
      type: String,
      enum: ["xero", "myob", "apa", "custom"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed", "partial"],
      default: "pending",
      required: true,
    },
    exportedAt: { type: Date },
    exportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exportPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    errorLog: { type: String },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    externalRef: { type: String },
    rowCount: {
      type: Number,
      required: true,
      default: 0,
    },
    employeeResults: [{
      employeeId: { type: mongoose.Schema.Types.ObjectId, required: true },
      status: { type: String, enum: ['pending', 'exported', 'failed'], default: 'pending' },
      error: { type: String },
      exportedAt: { type: Date },
      retryCount: { type: Number, default: 0 },
      _id: false,
    }],
    lastAttemptAt: { type: Date },
    nextRetryAt: { type: Date },
    maxRetries: { type: Number, default: 5 },
  },
  {
    timestamps: true,
    collection: "payroll_exports",
  }
)

payrollExportSchema.index({ tenantId: 1, payRunId: 1 })
payrollExportSchema.index({ tenantId: 1, exportedAt: -1 })
payrollExportSchema.index({ tenantId: 1, status: 1 })

export const PayrollExport =
  (mongoose.models.PayrollExport as mongoose.Model<IPayrollExportDocument>) ??
  mongoose.model<IPayrollExportDocument>("PayrollExport", payrollExportSchema)
