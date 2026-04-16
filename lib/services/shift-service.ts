import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { apiErrors } from "@/lib/api/api-error"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { AuditLog } from "@/lib/db/schemas/audit-log"
import { Roster } from "@/lib/db/schemas/roster"
import { Employee } from "@/lib/db/schemas/employee"
import Award from "@/lib/db/schemas/award"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { AwardEngine } from "@/lib/engines/award-engine"
import { timesheetEntryToShiftContext } from "@/lib/utils/timesheet-to-shift-context"
import { checkPublicHoliday } from "@/lib/utils/public-holidays"
import {
  assertCanApproveShift,
  assertCanEditShift,
  assertShiftEditable,
  validateShiftTimeAndBreaks,
  type EditableShiftChanges,
  type ShiftActor,
} from "@/lib/validation/shift-validation"

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function safeDate(d: unknown): Date | null {
  const out = d instanceof Date ? d : typeof d === "string" || typeof d === "number" ? new Date(d) : null
  if (!out || isNaN(out.getTime())) return null
  return out
}

function computeBreakMinutesFromBreaks(breaks: Array<{ startTime: Date; endTime: Date }>) {
  let minutes = 0
  for (const b of breaks) {
    const delta = Math.round((b.endTime.getTime() - b.startTime.getTime()) / (60 * 1000))
    if (delta > 0) minutes += delta
  }
  return minutes
}

function computeWorkingHours(clockIn: Date | null, clockOut: Date | null, breakMinutes: number) {
  if (!clockIn || !clockOut) return undefined
  const totalMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / (60 * 1000))
  if (totalMinutes <= 0) return undefined
  const workingMinutes = totalMinutes - breakMinutes
  return workingMinutes > 0 ? round2(workingMinutes / 60) : 0
}

function toTimesheetRow(shift: any) {
  const date = safeDate(shift?.date)
  const clockIn = safeDate(shift?.clockIn?.time)
  const clockOut = safeDate(shift?.clockOut?.time)
  if (!date) throw apiErrors.badRequest("Shift date missing")
  const dateStr = date.toISOString().slice(0, 10)

  const fmt = (d: Date | null) => (d ? d.toISOString().slice(11, 16) : "")

  const breaks = Array.isArray(shift?.breaks) ? shift.breaks : []
  const normalizedBreaks = breaks
    .map((b: any) => {
      const startTime = safeDate(b?.startTime)
      const endTime = safeDate(b?.endTime)
      if (!startTime || !endTime) return null
      return { startTime, endTime, isPaid: !!b?.isPaid }
    })
    .filter(Boolean) as Array<{ startTime: Date; endTime: Date; isPaid: boolean }>

  const breakMinutes = shift?.totalBreakMinutes ?? 0
  const totalMinutes = shift?.totalWorkingHours ? Math.round(Number(shift.totalWorkingHours) * 60) : 0

  return {
    date: dateStr,
    clockIn: fmt(clockIn),
    clockOut: fmt(clockOut),
    breakIn: "",
    breakOut: "",
    breakMinutes,
    breakHours: String(round2(breakMinutes / 60)),
    totalMinutes,
    totalHours: String(round2(totalMinutes / 60)),
    breaks: normalizedBreaks,
  }
}

export async function validateShiftAgainstRoster(input: { tenantId: string; shift: any }): Promise<{
  rosterShiftId: string | null
  roster?: { startTimeUtc: string; endTimeUtc: string; locationId: string; roleId: string; status?: "draft" | "published" | null } | null
  varianceMinutes?: { start: number | null; end: number | null } | null
}> {
  const rosterShiftId = input.shift?.rosterShiftId ? String(input.shift.rosterShiftId) : null
  if (!rosterShiftId) return { rosterShiftId: null, roster: null, varianceMinutes: null }

  if (!mongoose.Types.ObjectId.isValid(rosterShiftId)) {
    throw apiErrors.badRequest("Shift has invalid rosterShiftId")
  }

  const tenantObjectId = new mongoose.Types.ObjectId(input.tenantId)
  const shiftObjectId = new mongoose.Types.ObjectId(rosterShiftId)

  const rosterAgg = await Roster.aggregate([
    { $match: { tenantId: tenantObjectId, "shifts._id": shiftObjectId } },
    {
      $project: {
        status: 1,
        shifts: {
          $filter: { input: "$shifts", as: "s", cond: { $eq: ["$$s._id", shiftObjectId] } },
        },
      },
    },
  ])

  const rosterShift = rosterAgg?.[0]?.shifts?.[0] ?? null
  const rosterStatus = (rosterAgg?.[0]?.status ?? null) as "draft" | "published" | null
  if (!rosterShift) {
    return { rosterShiftId, roster: null, varianceMinutes: null }
  }

  const rosterStart = safeDate(rosterShift?.startTime)
  const rosterEnd = safeDate(rosterShift?.endTime)
  if (!rosterStart || !rosterEnd) return { rosterShiftId, roster: null, varianceMinutes: null }

  const actualStart = safeDate(input.shift?.clockIn?.time)
  const actualEnd = safeDate(input.shift?.clockOut?.time)

  const startVar =
    rosterStart && actualStart ? Math.round((actualStart.getTime() - rosterStart.getTime()) / (60 * 1000)) : null
  const endVar = rosterEnd && actualEnd ? Math.round((actualEnd.getTime() - rosterEnd.getTime()) / (60 * 1000)) : null

  // Basic roster integrity: employee must match if roster has an employeeId
  const rosterEmployeeId = rosterShift?.employeeId ? String(rosterShift.employeeId) : null
  const actualEmployeeId = input.shift?.employeeId ? String(input.shift.employeeId) : null
  if (rosterEmployeeId && actualEmployeeId && rosterEmployeeId !== actualEmployeeId) {
    throw apiErrors.badRequest("Shift employee does not match roster assignment")
  }

  return {
    rosterShiftId,
    roster: {
      startTimeUtc: rosterStart.toISOString(),
      endTimeUtc: rosterEnd.toISOString(),
      locationId: String(rosterShift.locationId),
      roleId: String(rosterShift.roleId),
      status: rosterStatus,
    },
    varianceMinutes: { start: startVar, end: endVar },
  }
}

export async function recalculateWageCost(input: { shift: any; employee: any; preferSnapshot?: boolean }) {
  const shift = input.shift
  const employee = input.employee

  if (!employee?.awardId) throw apiErrors.badRequest("Employee has no award assigned")

  const shiftDate = safeDate(shift?.date)
  if (!shiftDate) throw apiErrors.badRequest("Shift has invalid date")

  const snapshot = shift?.paySnapshot ?? null
  const preferSnapshot = input.preferSnapshot ?? true

  const awardId = preferSnapshot && snapshot?.awardId ? String(snapshot.awardId) : String(employee.awardId)
  const awardLevel = preferSnapshot && snapshot?.awardLevel ? String(snapshot.awardLevel) : String(employee.awardLevel ?? "")
  const snapshotBaseRate = preferSnapshot && snapshot?.baseRate ? Number(snapshot.baseRate) : null

  const award = await Award.findById(awardId)
  if (!award) throw apiErrors.notFound("Award not found")

  let baseRate = snapshotBaseRate ?? null
  if (baseRate == null) {
    const levelRates = (award as any).levelRates ?? []
    const employmentType = String(employee.employmentType ?? "casual")
    const rate = levelRates.find((r: any) => {
      if (String(r.level) !== awardLevel) return false
      if (String(r.employmentType) !== employmentType) return false
      if (r.effectiveFrom && safeDate(r.effectiveFrom) && safeDate(r.effectiveFrom)!.getTime() > shiftDate.getTime()) {
        return false
      }
      const effTo = safeDate(r.effectiveTo)
      if (effTo && effTo.getTime() <= shiftDate.getTime()) return false
      return true
    })
    baseRate = rate?.hourlyRate != null ? Number(rate.hourlyRate) : null
  }

  if (baseRate == null || !isFinite(baseRate) || baseRate <= 0) {
    throw apiErrors.badRequest("Unable to determine base rate for employee/award")
  }

  const isPublicHoliday = await checkPublicHoliday(shiftDate, employee?.state)
  const timesheetRow = toTimesheetRow(shift)
  if (!timesheetRow.clockIn || !timesheetRow.clockOut) {
    // Incomplete shifts can be saved but wage can't be computed deterministically.
    return { computed: null }
  }

  const shiftContext = timesheetEntryToShiftContext(
    timesheetRow as any,
    {
      id: String(employee._id),
      employmentType: String(employee.employmentType ?? "casual"),
      baseRate,
      awardTags: Array.isArray(shift?.awardTags) ? shift.awardTags : [],
    },
    0,
    isPublicHoliday
  )

  const engine = new AwardEngine(award as any)
  const result = engine.processShift(shiftContext)

  const computed = {
    payLines: (result.payLines ?? []).map((line: any) => ({
      units: Number(line.units ?? 0),
      from: safeDate(line.from) ?? new Date(line.from),
      to: safeDate(line.to) ?? new Date(line.to),
      name: String(line.name ?? ""),
      exportName: String(line.exportName ?? ""),
      ordinaryHours: Number(line.ordinaryHours ?? 0),
      cost: Number(line.cost ?? 0),
      baseRate: Number(line.baseRate ?? baseRate),
      multiplier: line.multiplier != null ? Number(line.multiplier) : undefined,
      ruleId: line.ruleId != null ? String(line.ruleId) : undefined,
    })),
    totalCost: Number(result.totalCost ?? 0),
    totalHours: Number(result.totalHours ?? 0),
    awardId: new mongoose.Types.ObjectId(awardId),
    awardLevel,
    baseRate,
    calculatedAt: new Date(),
    awardVersion: (award as any)?.version ? String((award as any).version) : undefined,
    breakEntitlements: result.breakEntitlements ?? [],
    leaveAccruals: result.leaveAccruals ?? [],
    lastCalculated: new Date(),
  }

  return { computed }
}

export async function logShiftEdit(input: {
  actor: ShiftActor
  shift: any
  action: "UPDATE" | "APPROVE"
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string
  userAgent?: string
}) {
  const shift = input.shift
  await AuditLog.create({
    organizationId: shift?.tenantId ? String(shift.tenantId) : undefined,
    rosterId: shift?.rosterShiftId ?? null,
    employeeId: shift?.employeeId ?? null,
    userId: new mongoose.Types.ObjectId(input.actor.userId),
    action: input.action,
    entityType: "DailyShift",
    entityId: String(shift?._id ?? ""),
    oldValue: input.oldValue,
    newValue: input.newValue,
    ipAddress: input.ipAddress ?? "",
    userAgent: input.userAgent ?? "",
  })
}

export async function editShift(
  shiftId: string,
  changes: EditableShiftChanges,
  actor: ShiftActor,
  reqMeta?: { ipAddress?: string; userAgent?: string }
) {
  await connectDB()
  if (!mongoose.Types.ObjectId.isValid(shiftId)) throw apiErrors.badRequest("Invalid shift id")

  assertCanEditShift(actor)

  const shift = await DailyShift.findById(shiftId)
  if (!shift) throw apiErrors.notFound("Shift not found")
  if (String((shift as any).tenantId) !== String(actor.tenantId)) throw apiErrors.forbidden()

  const now = new Date()
  assertShiftEditable(shift, now)

  const existingClockInUtc = (shift as any).clockIn?.time ? new Date((shift as any).clockIn.time).toISOString() : null
  const existingClockOutUtc = (shift as any).clockOut?.time ? new Date((shift as any).clockOut.time).toISOString() : null
  const effectiveClockInUtc = changes.clockInUtc !== undefined ? changes.clockInUtc : existingClockInUtc
  const effectiveClockOutUtc = changes.clockOutUtc !== undefined ? changes.clockOutUtc : existingClockOutUtc
  const existingBreaksUtc = Array.isArray((shift as any).breaks)
    ? (shift as any).breaks
        .map((b: any) => ({
          startTimeUtc: b?.startTime ? new Date(b.startTime).toISOString() : null,
          endTimeUtc: b?.endTime ? new Date(b.endTime).toISOString() : null,
          isPaid: !!b?.isPaid,
          source: (b?.source ?? "clocked") as any,
        }))
        .filter((b: any) => b.startTimeUtc && b.endTimeUtc)
    : []
  const effectiveBreaks =
    changes.breaks !== undefined ? changes.breaks : (changes.clockInUtc !== undefined || changes.clockOutUtc !== undefined ? (existingBreaksUtc as any) : undefined)

  validateShiftTimeAndBreaks({
    clockInUtc: effectiveClockInUtc,
    clockOutUtc: effectiveClockOutUtc,
    breaks: effectiveBreaks,
  })

  const oldValue = {
    clockInUtc: existingClockInUtc,
    clockOutUtc: existingClockOutUtc,
    breaks: Array.isArray((shift as any).breaks)
      ? (shift as any).breaks.map((b: any) => ({
          startTimeUtc: b?.startTime ? new Date(b.startTime).toISOString() : null,
          endTimeUtc: b?.endTime ? new Date(b.endTime).toISOString() : null,
          isPaid: !!b?.isPaid,
          source: b?.source ?? "clocked",
        }))
      : [],
    awardTags: Array.isArray((shift as any).awardTags) ? [...(shift as any).awardTags] : [],
    totalBreakMinutes: (shift as any).totalBreakMinutes ?? 0,
    totalWorkingHours: (shift as any).totalWorkingHours ?? null,
    computedTotalCost: (shift as any).computed?.totalCost ?? null,
    status: (shift as any).status,
    approvedAt: (shift as any).approvedAt ?? null,
  }

  if (changes.clockInUtc !== undefined) {
    if (changes.clockInUtc == null) (shift as any).clockIn = undefined
    else (shift as any).clockIn = { ...(shift as any).clockIn, time: new Date(changes.clockInUtc), flag: false }
  }
  if (changes.clockOutUtc !== undefined) {
    if (changes.clockOutUtc == null) (shift as any).clockOut = undefined
    else (shift as any).clockOut = { ...(shift as any).clockOut, time: new Date(changes.clockOutUtc), flag: false }
  }

  if (changes.breaks !== undefined) {
    if (changes.breaks == null) {
      ;(shift as any).breaks = []
    } else {
      ;(shift as any).breaks = changes.breaks.map((b) => ({
        startTime: new Date(b.startTimeUtc),
        endTime: new Date(b.endTimeUtc),
        isPaid: !!b.isPaid,
        source: b.source ?? "clocked",
      }))
    }
  }

  if (changes.awardTags !== undefined) {
    ;(shift as any).awardTags = Array.isArray(changes.awardTags) ? changes.awardTags : []
  }

  // Recompute totals (prefer breaks[] if present, else fall back to legacy breakIn/breakOut)
  const clockIn = safeDate((shift as any).clockIn?.time)
  const clockOut = safeDate((shift as any).clockOut?.time)
  const breaks = Array.isArray((shift as any).breaks) ? (shift as any).breaks : []
  const parsedBreaks = breaks
    .map((b: any) => ({ startTime: safeDate(b?.startTime), endTime: safeDate(b?.endTime) }))
    .filter((b: any) => b.startTime && b.endTime) as Array<{ startTime: Date; endTime: Date }>

  const totalBreakMinutes = parsedBreaks.length > 0 ? computeBreakMinutesFromBreaks(parsedBreaks) : ((shift as any).totalBreakMinutes ?? 0)
  ;(shift as any).totalBreakMinutes = totalBreakMinutes
  ;(shift as any).totalWorkingHours = computeWorkingHours(clockIn, clockOut, totalBreakMinutes)
  ;(shift as any).source = "manual"

  // If an approved shift is edited, force re-approval.
  if (String((shift as any).status) === "approved") {
    ;(shift as any).status = "completed"
    ;(shift as any).approvedAt = null
    ;(shift as any).approvedBy = null
  }

  const rosterCheck = await validateShiftAgainstRoster({ tenantId: actor.tenantId, shift })
  // If the roster is published, prevent large edits that materially diverge.
  if (rosterCheck.roster?.status === "published") {
    const thresholdMinutes = 30
    const startVar = rosterCheck.varianceMinutes?.start ?? null
    const endVar = rosterCheck.varianceMinutes?.end ?? null
    const startOk = startVar == null ? true : Math.abs(startVar) <= thresholdMinutes
    const endOk = endVar == null ? true : Math.abs(endVar) <= thresholdMinutes
    if (!startOk || !endOk) {
      throw apiErrors.badRequest(`Shift cannot be edited beyond ${thresholdMinutes} minutes when roster is published`)
    }
  }

  // Wage recalculation (best-effort; skip if shift incomplete)
  const employee = await Employee.findById((shift as any).employeeId)
  if (!employee) throw apiErrors.notFound("Employee not found for shift")
  const wage = await recalculateWageCost({ shift, employee })
  if (wage.computed) {
    ;(shift as any).computed = wage.computed
  }

  // If this shift is part of a payrun, any edit invalidates the run totals.
  const payRunId = (shift as any).computed?.payRunId ?? (shift as any).paySnapshot?.payRunId ?? null
  if (payRunId && mongoose.Types.ObjectId.isValid(String(payRunId))) {
    await PayRun.updateOne(
      { _id: new mongoose.Types.ObjectId(String(payRunId)), status: { $ne: "draft" } },
      {
        $set: { status: "draft" },
        $unset: { approvedBy: 1, approvedAt: 1, exportedAt: 1, exportedBy: 1, exportReference: 1 },
      }
    )
  }

  await (shift as any).save()

  const newValue = {
    clockInUtc: (shift as any).clockIn?.time ? new Date((shift as any).clockIn.time).toISOString() : null,
    clockOutUtc: (shift as any).clockOut?.time ? new Date((shift as any).clockOut.time).toISOString() : null,
    breaks: Array.isArray((shift as any).breaks)
      ? (shift as any).breaks.map((b: any) => ({
          startTimeUtc: b?.startTime ? new Date(b.startTime).toISOString() : null,
          endTimeUtc: b?.endTime ? new Date(b.endTime).toISOString() : null,
          isPaid: !!b?.isPaid,
          source: b?.source ?? "clocked",
        }))
      : [],
    awardTags: Array.isArray((shift as any).awardTags) ? [...(shift as any).awardTags] : [],
    totalBreakMinutes: (shift as any).totalBreakMinutes ?? 0,
    totalWorkingHours: (shift as any).totalWorkingHours ?? null,
    computedTotalCost: (shift as any).computed?.totalCost ?? null,
    status: (shift as any).status,
    approvedAt: (shift as any).approvedAt ?? null,
  }

  await logShiftEdit({
    actor,
    shift,
    action: "UPDATE",
    oldValue,
    newValue,
    ipAddress: reqMeta?.ipAddress,
    userAgent: reqMeta?.userAgent,
  })

  return { success: true, shift }
}

export async function approveShift(shiftId: string, actor: ShiftActor, reqMeta?: { ipAddress?: string; userAgent?: string }) {
  await connectDB()
  if (!mongoose.Types.ObjectId.isValid(shiftId)) throw apiErrors.badRequest("Invalid shift id")
  assertCanApproveShift(actor)

  const shift = await DailyShift.findById(shiftId)
  if (!shift) throw apiErrors.notFound("Shift not found")
  if (String((shift as any).tenantId) !== String(actor.tenantId)) throw apiErrors.forbidden()

  const now = new Date()
  assertShiftEditable(shift, now, { maxDaysBack: 365 * 10 }) // approval can happen older than edit window

  const status = String((shift as any).status ?? "")
  if (["locked", "processed", "exported"].includes(status)) {
    throw apiErrors.badRequest(`Shift cannot be approved in '${status}' status`)
  }
  if (!(shift as any).clockIn?.time || !(shift as any).clockOut?.time) {
    throw apiErrors.badRequest("Shift must have clockIn and clockOut before approval")
  }

  const oldValue = { status: (shift as any).status, approvedAt: (shift as any).approvedAt ?? null, approvedBy: (shift as any).approvedBy ?? null }
  ;(shift as any).status = "approved"
  ;(shift as any).approvedBy = new mongoose.Types.ObjectId(actor.userId) as any
  ;(shift as any).approvedAt = now

  await (shift as any).save()

  const newValue = { status: (shift as any).status, approvedAt: (shift as any).approvedAt ?? null, approvedBy: (shift as any).approvedBy ?? null }

  await logShiftEdit({
    actor,
    shift,
    action: "APPROVE",
    oldValue,
    newValue,
    ipAddress: reqMeta?.ipAddress,
    userAgent: reqMeta?.userAgent,
  })

  return { success: true, shift }
}

