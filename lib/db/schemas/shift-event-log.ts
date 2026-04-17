import mongoose from 'mongoose'

export type ShiftEventAction =
  | 'created'
  | 'deleted'
  | 'time_changed'
  | 'break_changed'
  | 'employee_changed'
  | 'role_changed'
  | 'location_changed'
  | 'status_changed'
  | 'pay_calculated'
  | 'pay_approved'
  | 'clocked_in'
  | 'clocked_out'
  | 'break_started'
  | 'break_ended'
  | 'multi_field_change'

/** Derive action from a list of changed field names. */
export function deriveShiftAction(changedFields: string[]): ShiftEventAction {
  if (changedFields.length === 0) return 'multi_field_change'
  if (changedFields.includes('start') || changedFields.includes('end') ||
      changedFields.includes('startTime') || changedFields.includes('endTime')) return 'time_changed'
  if (changedFields.includes('breakMinutes') || changedFields.includes('totalBreakMinutes')) return 'break_changed'
  if (changedFields.includes('employeeId')) return 'employee_changed'
  if (changedFields.includes('roleId')) return 'role_changed'
  if (changedFields.includes('locationId')) return 'location_changed'
  if (changedFields.includes('status')) return 'status_changed'
  if (changedFields.length > 2) return 'multi_field_change'
  return 'multi_field_change'
}

export interface IShiftEventLog {
  _id: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  shiftId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  action: ShiftEventAction
  changedFields: string[]
  actorId: string
  actorType: 'user' | 'employee' | 'system'
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  meta?: Record<string, unknown>
  occurredAt: Date
  createdAt: Date
}

export interface IShiftEventLogDocument extends IShiftEventLog, mongoose.Document {}

const schema = new mongoose.Schema<IShiftEventLogDocument>(
  {
    tenantId:      { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    shiftId:       { type: mongoose.Schema.Types.ObjectId, required: true },
    employeeId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    action:        { type: String, required: true },
    changedFields: [{ type: String }],
    actorId:       { type: String, required: true },
    actorType:     { type: String, enum: ['user', 'employee', 'system'], required: true },
    before:        { type: mongoose.Schema.Types.Mixed },
    after:         { type: mongoose.Schema.Types.Mixed },
    meta:          { type: mongoose.Schema.Types.Mixed },
    occurredAt:    { type: Date, required: true, default: () => new Date() },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'shift_event_log',
  }
)

schema.index({ tenantId: 1, shiftId: 1, occurredAt: 1 })
schema.index({ tenantId: 1, employeeId: 1, occurredAt: -1 })

export const ShiftEventLog =
  (mongoose.models.ShiftEventLog as mongoose.Model<IShiftEventLogDocument>) ??
  mongoose.model<IShiftEventLogDocument>('ShiftEventLog', schema)
