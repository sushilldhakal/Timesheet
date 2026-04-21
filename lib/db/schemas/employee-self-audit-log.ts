import mongoose from 'mongoose'

export type EmployeeSelfAuditAction =
  | 'COMPLETE_ONBOARDING'
  | 'UPDATE_PROFILE'
  | 'UPDATE_PAYROLL'

export interface IEmployeeSelfAuditLog {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  action: EmployeeSelfAuditAction
  changedFields?: string[]
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt?: Date
}

export interface IEmployeeSelfAuditLogDocument extends IEmployeeSelfAuditLog, mongoose.Document {}

const employeeSelfAuditLogSchema = new mongoose.Schema<IEmployeeSelfAuditLogDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    action: {
      type: String,
      enum: ['COMPLETE_ONBOARDING', 'UPDATE_PROFILE', 'UPDATE_PAYROLL'],
      required: true,
      index: true,
    },
    changedFields: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: undefined },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'employee_self_audit_logs',
  }
)

employeeSelfAuditLogSchema.index({ tenantId: 1, employeeId: 1, createdAt: -1 })

export const EmployeeSelfAuditLog =
  (mongoose.models.EmployeeSelfAuditLog as mongoose.Model<IEmployeeSelfAuditLogDocument>) ??
  mongoose.model<IEmployeeSelfAuditLogDocument>('EmployeeSelfAuditLog', employeeSelfAuditLogSchema)

