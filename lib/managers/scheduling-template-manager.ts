import { addDays } from "date-fns"
import type { IShift, IRosterTemplateDocument, ITemplateShift } from "@/lib/db/queries/scheduling-types"
import { getWeekBoundaries } from "@/lib/db/queries/scheduling-types"
import { setTimeFromDecimalHours } from "@/lib/utils/format/decimal-hours"
import { SchedulingTemplatesDbQueries, oid } from "@/lib/db/queries/scheduling-templates"

function shiftDateForDayOfWeek(weekStartDate: Date, dayOfWeek: number): Date {
  return addDays(new Date(weekStartDate), dayOfWeek === 0 ? 6 : dayOfWeek - 1)
}

function decimalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60
}

export class SchedulingTemplateManager {
  async listForUser(userId: string, isAdmin: boolean): Promise<IRosterTemplateDocument[]> {
    if (isAdmin) {
      return (await SchedulingTemplatesDbQueries.rosterTemplate
        .findLean({})
        .sort({ updatedAt: -1 })) as unknown as IRosterTemplateDocument[]
    }
    const uid = oid(userId)
    return (await SchedulingTemplatesDbQueries.rosterTemplate
      .findLean({
        $or: [{ createdBy: uid }, { isGlobal: true }],
      })
      .sort({ updatedAt: -1 })) as unknown as IRosterTemplateDocument[]
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
    const roster = await SchedulingTemplatesDbQueries.roster.findOne({ weekId })
    if (!roster) {
      throw new Error(`Roster not found for week ${weekId}`)
    }

    const locOid = oid(locationId)
    const roleOidSet =
      roleIds.length > 0 ? new Set(roleIds.map((id) => oid(id).toString())) : null

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
        ? roleIds.map((id) => oid(id))
        : [...distinctRoleIds].map((id) => oid(id))

    const doc = await SchedulingTemplatesDbQueries.rosterTemplate.create({
      name,
      createdBy: oid(createdBy),
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
    const t = await SchedulingTemplatesDbQueries.rosterTemplate.findById(id)
    if (!t) return { deleted: false }
    if (!isAdmin && t.createdBy.toString() !== userId) {
      throw new Error("Forbidden")
    }
    await SchedulingTemplatesDbQueries.rosterTemplate.deleteOne({ _id: id })
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
    const locOid = oid(locationId)
    const template = await SchedulingTemplatesDbQueries.rosterTemplate.findById(templateId)
    if (!template) {
      throw new Error("Template not found")
    }

    if (!template.locationId.equals(locOid)) {
      throw new Error("Template location does not match target location")
    }

    let roster = await SchedulingTemplatesDbQueries.roster.findOne({ weekId: targetWeekId })
    if (!roster) {
      const { start, end } = getWeekBoundaries(targetWeekId)
      const [yearStr, weekStr] = targetWeekId.split("-W")
      roster = await SchedulingTemplatesDbQueries.roster.create({
        weekId: targetWeekId,
        year: parseInt(yearStr, 10),
        weekNumber: parseInt(weekStr, 10),
        weekStartDate: start,
        weekEndDate: end,
        shifts: [],
        status: "draft",
      })
    }

    const roleSet = new Set(roleIds.map((r) => oid(r).toString()))

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
        _id: oid(),
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
