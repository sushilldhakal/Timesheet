import mongoose from "mongoose"
import { addDays } from "date-fns"
import { Roster, IShift, getWeekBoundaries } from "@/lib/db/schemas/roster"
import {
  RosterTemplate,
  IRosterTemplateDocument,
  ITemplateShift,
} from "@/lib/db/schemas/roster-template"
import { setTimeFromDecimalHours } from "@/lib/utils/format/decimal-hours"

function shiftDateForDayOfWeek(weekStartDate: Date, dayOfWeek: number): Date {
  return addDays(new Date(weekStartDate), dayOfWeek === 0 ? 6 : dayOfWeek - 1)
}

function decimalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60
}

export class SchedulingTemplateManager {
  async listForUser(userId: string, isAdmin: boolean): Promise<IRosterTemplateDocument[]> {
    if (isAdmin) {
      return RosterTemplate.find({}).sort({ updatedAt: -1 }).lean() as unknown as IRosterTemplateDocument[]
    }
    const uid = new mongoose.Types.ObjectId(userId)
    return RosterTemplate.find({
      $or: [{ createdBy: uid }, { isGlobal: true }],
    })
      .sort({ updatedAt: -1 })
      .lean() as unknown as IRosterTemplateDocument[]
  }

  async createFromWeek(params: {
    name: string
    weekId: string
    locationId: string
    roleIds: string[]
    createdBy: string
    isGlobal?: boolean
  }): Promise<IRosterTemplateDocument> {
    const { name, weekId, locationId, roleIds, createdBy, isGlobal } = params
    const roster = await Roster.findOne({ weekId })
    if (!roster) {
      throw new Error(`Roster not found for week ${weekId}`)
    }

    const locOid = new mongoose.Types.ObjectId(locationId)
    const roleOidSet =
      roleIds.length > 0 ? new Set(roleIds.map((id) => new mongoose.Types.ObjectId(id).toString())) : null

    const templateShifts: ITemplateShift[] = []
    const distinctRoleIds = new Set<string>()
    for (const s of roster.shifts) {
      if (!s.locationId.equals(locOid)) continue
      if (roleOidSet && !roleOidSet.has(s.roleId.toString())) continue
      distinctRoleIds.add(s.roleId.toString())
      const d = new Date(s.date)
      templateShifts.push({
        dayOfWeek: d.getDay(),
        startHour: decimalHour(new Date(s.startTime)),
        endHour: decimalHour(new Date(s.endTime)),
        roleId: s.roleId,
        employeeId: s.employeeId ?? undefined,
      })
    }

    const resolvedRoleIds =
      roleIds.length > 0
        ? roleIds.map((id) => new mongoose.Types.ObjectId(id))
        : [...distinctRoleIds].map((id) => new mongoose.Types.ObjectId(id))

    const doc = await RosterTemplate.create({
      name,
      createdBy: new mongoose.Types.ObjectId(createdBy),
      locationId: locOid,
      roleIds: resolvedRoleIds,
      isGlobal: !!isGlobal,
      templateShifts,
    })

    return doc.toObject() as IRosterTemplateDocument
  }

  async deleteTemplate(
    id: string,
    userId: string,
    isAdmin: boolean
  ): Promise<{ deleted: boolean }> {
    const t = await RosterTemplate.findById(id)
    if (!t) return { deleted: false }
    if (!isAdmin && t.createdBy.toString() !== userId) {
      throw new Error("Forbidden")
    }
    await RosterTemplate.deleteOne({ _id: id })
    return { deleted: true }
  }

  async applyTemplate(params: {
    templateId: string
    targetWeekId: string
    mode: "add" | "replace"
    locationId: string
    roleIds: string[]
  }): Promise<{ shiftsCreated: number }> {
    const { templateId, targetWeekId, mode, locationId, roleIds } = params
    const locOid = new mongoose.Types.ObjectId(locationId)
    const template = await RosterTemplate.findById(templateId)
    if (!template) {
      throw new Error("Template not found")
    }

    if (!template.locationId.equals(locOid)) {
      throw new Error("Template location does not match target location")
    }

    let roster = await Roster.findOne({ weekId: targetWeekId })
    if (!roster) {
      const { start, end } = getWeekBoundaries(targetWeekId)
      const [yearStr, weekStr] = targetWeekId.split("-W")
      roster = await Roster.create({
        weekId: targetWeekId,
        year: parseInt(yearStr, 10),
        weekNumber: parseInt(weekStr, 10),
        weekStartDate: start,
        weekEndDate: end,
        shifts: [],
        status: "draft",
      })
    }

    const roleSet = new Set(roleIds.map((r) => new mongoose.Types.ObjectId(r).toString()))

    if (mode === "replace") {
      roster.shifts = roster.shifts.filter((s) => {
        const inScope =
          s.locationId.equals(locOid) && (roleIds.length === 0 || roleSet.has(s.roleId.toString()))
        if (!inScope) return true
        if (s.status === "draft") return false
        return true
      })
    }

    const weekStart = new Date(roster.weekStartDate)
    const weekEnd = new Date(roster.weekEndDate)
    let shiftsCreated = 0

    for (const ts of template.templateShifts) {
      const shiftDate = shiftDateForDayOfWeek(weekStart, ts.dayOfWeek)
      if (shiftDate < weekStart || shiftDate > weekEnd) continue
      if (roleIds.length > 0 && !roleSet.has(ts.roleId.toString())) continue

      const startH = ts.startHour
      const endH = ts.endHour
      const shiftStartTime = new Date(shiftDate)
      setTimeFromDecimalHours(shiftStartTime, startH)
      const shiftEndTime = new Date(shiftDate)
      setTimeFromDecimalHours(shiftEndTime, endH)

      const newShift: IShift = {
        _id: new mongoose.Types.ObjectId(),
        employeeId: ts.employeeId ?? null,
        date: shiftDate,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        locationId: locOid,
        roleId: ts.roleId,
        sourceScheduleId: null,
        estimatedCost: 0,
        notes: `From template: ${template.name}`,
        status: "draft",
      }
      roster.shifts.push(newShift)
      shiftsCreated++
    }

    await roster.save()
    return { shiftsCreated }
  }
}
