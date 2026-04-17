import { ShiftEventLog, ShiftEventAction, deriveShiftAction } from '@/lib/db/schemas/shift-event-log'
import { scope } from '@/lib/db/tenant-model'

interface LogShiftEventArgs {
  tenantId: string
  shiftId: string
  employeeId: string
  /** Explicit action override. If omitted, derived from changedFields or before/after diff. */
  action?: ShiftEventAction
  changedFields?: string[]
  actorId: string
  actorType: 'user' | 'employee' | 'system'
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  meta?: Record<string, unknown>
}

/**
 * Compute which top-level fields differ between two objects.
 * Used to auto-populate changedFields without the caller guessing.
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  return Array.from(allKeys).filter((key) => {
    return JSON.stringify(before[key]) !== JSON.stringify(after[key])
  })
}

export const shiftAuditService = {
  /**
   * Log a shift event. changedFields and action are auto-derived from before/after if not provided.
   * Fire-and-forget safe — errors are swallowed so audit failures never break the main flow.
   */
  async log(args: LogShiftEventArgs): Promise<void> {
    const changedFields =
      args.changedFields ??
      (args.before && args.after ? diffObjects(args.before, args.after) : [])

    const action =
      args.action ??
      (changedFields.length === 0 ? 'multi_field_change' : deriveShiftAction(changedFields))

    await ShiftEventLog.create({
      tenantId: args.tenantId,
      shiftId: args.shiftId,
      employeeId: args.employeeId,
      action,
      changedFields,
      actorId: args.actorId,
      actorType: args.actorType,
      before: args.before,
      after: args.after,
      meta: args.meta,
      occurredAt: new Date(),
    })
  },

  /** Get chronological event history for a shift. */
  async getShiftHistory(tenantId: string, shiftId: string) {
    return scope(ShiftEventLog, tenantId)
      .find({ shiftId })
      .sort({ occurredAt: 1 })
      .lean()
  },

  /**
   * Reconstruct shift state at a specific point in time by replaying after-snapshots.
   */
  async reconstructAtTime(tenantId: string, shiftId: string, asOf: Date) {
    const events = await scope(ShiftEventLog, tenantId)
      .find({ shiftId, occurredAt: { $lte: asOf } })
      .sort({ occurredAt: 1 })
      .lean()

    let state: Record<string, unknown> = {}
    for (const event of events) {
      if (event.after) state = { ...state, ...event.after }
    }
    return { state, eventCount: events.length, asOf }
  },

  /** Get all shift events for an employee over a date range. */
  async getEmployeeAuditTrail(tenantId: string, employeeId: string, from: Date, to: Date) {
    return scope(ShiftEventLog, tenantId)
      .find({ employeeId, occurredAt: { $gte: from, $lte: to } })
      .sort({ occurredAt: -1 })
      .lean()
  },
}
