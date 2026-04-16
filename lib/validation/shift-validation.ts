import { differenceInCalendarDays } from "date-fns"
import { apiErrors } from "@/lib/api/api-error"

export type ShiftActor = {
  userId: string
  role: string
  tenantId: string
  /** null means admin-style global scope */
  userLocations: string[] | null
  /** null means admin-style global scope */
  managedRoles: string[] | null
}

export type EditableShiftChanges = {
  clockInUtc?: string | null
  clockOutUtc?: string | null
  breaks?: Array<{
    startTimeUtc: string
    endTimeUtc: string
    isPaid?: boolean
    source?: "clocked" | "automatic"
  }> | null
  awardTags?: string[] | null
}

function parseIsoUtc(s: string, field: string): Date {
  const d = new Date(s)
  if (isNaN(d.getTime())) throw apiErrors.badRequest(`Invalid ${field}`)
  return d
}

export function assertCanEditShift(actor: ShiftActor) {
  const allowedRoles = ["admin", "super_admin", "manager", "supervisor", "accounts"]
  if (!allowedRoles.includes(actor.role)) {
    throw apiErrors.forbidden("Only managers/admins can edit shifts")
  }
}

export function assertCanApproveShift(actor: ShiftActor) {
  const allowedRoles = ["admin", "super_admin", "manager", "supervisor"]
  if (!allowedRoles.includes(actor.role)) {
    throw apiErrors.forbidden("Only managers/admins can approve shifts")
  }
}

export function assertShiftEditable(shift: any, now: Date, opts?: { maxDaysBack?: number }) {
  const status = String(shift?.status ?? "")
  if (["locked", "processed", "exported"].includes(status)) {
    throw apiErrors.badRequest(`Shift cannot be edited in '${status}' status`)
  }

  const maxDaysBack = opts?.maxDaysBack ?? 30
  const shiftDate = shift?.date instanceof Date ? shift.date : shift?.date ? new Date(shift.date) : null
  if (!shiftDate || isNaN(shiftDate.getTime())) {
    throw apiErrors.badRequest("Shift has invalid date")
  }
  if (differenceInCalendarDays(now, shiftDate) > maxDaysBack) {
    throw apiErrors.badRequest(`Shift is outside the edit window (${maxDaysBack} days)`)
  }
}

export function validateShiftTimeAndBreaks(input: {
  clockInUtc?: string | null
  clockOutUtc?: string | null
  breaks?: EditableShiftChanges["breaks"]
}) {
  const clockIn = input.clockInUtc == null ? null : parseIsoUtc(input.clockInUtc, "clockInUtc")
  const clockOut = input.clockOutUtc == null ? null : parseIsoUtc(input.clockOutUtc, "clockOutUtc")
  if (clockIn && clockOut && clockOut <= clockIn) {
    throw apiErrors.badRequest("clockOutUtc must be after clockInUtc")
  }

  const breaks = input.breaks
  if (breaks == null) return

  if (!Array.isArray(breaks)) throw apiErrors.badRequest("breaks must be an array")
  if (breaks.length > 0 && (!clockIn || !clockOut)) {
    throw apiErrors.badRequest("clockInUtc and clockOutUtc are required when breaks are provided")
  }

  let totalBreakMinutes = 0
  const parsed = breaks.map((b, idx) => {
    const start = parseIsoUtc(b.startTimeUtc, `breaks[${idx}].startTimeUtc`)
    const end = parseIsoUtc(b.endTimeUtc, `breaks[${idx}].endTimeUtc`)
    if (end <= start) throw apiErrors.badRequest(`breaks[${idx}] endTimeUtc must be after startTimeUtc`)
    if (clockIn && start < clockIn) throw apiErrors.badRequest(`breaks[${idx}] starts before clockInUtc`)
    if (clockOut && end > clockOut) throw apiErrors.badRequest(`breaks[${idx}] ends after clockOutUtc`)
    totalBreakMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 1000)))
    return { start, end }
  })

  parsed.sort((a, b) => a.start.getTime() - b.start.getTime())
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i]!.start < parsed[i - 1]!.end) {
      throw apiErrors.badRequest("Breaks cannot overlap")
    }
  }

  if (clockIn && clockOut) {
    const shiftMinutes = Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / (60 * 1000)))
    if (totalBreakMinutes > shiftMinutes) {
      throw apiErrors.badRequest("Total break duration cannot exceed shift duration")
    }
  }
}

