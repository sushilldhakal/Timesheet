import mongoose from "mongoose"
import { ISchedule } from "../db/schemas/schedule"
import { RosterTemplate } from "../db/schemas/roster-template"
import type { ShiftPattern, RoleTemplate } from "./template-manager-types"

export type { ShiftPattern, RoleTemplate } from "./template-manager-types"

function hoursFromDate(d: Date): number {
  return d.getHours() + d.getMinutes() / 60
}

/**
 * Role / schedule templates backed by RosterTemplate (no fake Employee rows).
 */
export class TemplateManager {
  async createRoleTemplate(
    roleId: string,
    _organizationId: string,
    shiftPattern: ShiftPattern,
    createdByUserId: string
  ): Promise<RoleTemplate> {
    const locId = shiftPattern.locationId
    const rid = shiftPattern.roleId || roleId
    const start = new Date(shiftPattern.startTime)
    const end = new Date(shiftPattern.endTime)
    const startHour = hoursFromDate(start)
    const endHour = hoursFromDate(end)

    const templateShifts = shiftPattern.dayOfWeek.map((dayOfWeek) => ({
      dayOfWeek,
      startHour,
      endHour,
      roleId: new mongoose.Types.ObjectId(rid),
      employeeId: undefined as undefined,
    }))

    const doc = await RosterTemplate.create({
      name: `Role template ${roleId.slice(-6)}`,
      createdBy: new mongoose.Types.ObjectId(createdByUserId),
      locationId: new mongoose.Types.ObjectId(locId),
      roleIds: [new mongoose.Types.ObjectId(rid)],
      isGlobal: false,
      templateShifts,
    })

    return this.toRoleTemplate(doc.toObject(), shiftPattern, roleId, _organizationId)
  }

  async copyTemplateToEmployee(
    templateId: string,
    employeeId: string,
    overwrite: boolean = false
  ): Promise<ISchedule> {
    const { Employee } = await import("../db/schemas/employee")
    const template = await RosterTemplate.findById(templateId)
    if (!template || !template.templateShifts.length) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const employee = await Employee.findById(employeeId)
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`)
    }

    const byKey = new Map<
      string,
      { dayOfWeek: number[]; startHour: number; endHour: number; locationId: mongoose.Types.ObjectId; roleId: mongoose.Types.ObjectId }
    >()
    for (const ts of template.templateShifts) {
      const k = `${ts.startHour}-${ts.endHour}-${ts.roleId}-${template.locationId}`
      if (!byKey.has(k)) {
        byKey.set(k, {
          dayOfWeek: [],
          startHour: ts.startHour,
          endHour: ts.endHour,
          locationId: template.locationId,
          roleId: ts.roleId,
        })
      }
      byKey.get(k)!.dayOfWeek.push(ts.dayOfWeek)
    }

    const newSchedules: ISchedule[] = []
    for (const g of byKey.values()) {
      const base = new Date()
      base.setHours(Math.floor(g.startHour), Math.round((g.startHour % 1) * 60), 0, 0)
      const baseEnd = new Date()
      baseEnd.setHours(Math.floor(g.endHour), Math.round((g.endHour % 1) * 60), 0, 0)
      newSchedules.push({
        _id: new mongoose.Types.ObjectId(),
        dayOfWeek: [...new Set(g.dayOfWeek)].sort((a, b) => a - b),
        startTime: base,
        endTime: baseEnd,
        locationId: g.locationId,
        roleId: g.roleId,
        effectiveFrom: new Date(),
        effectiveTo: null,
        priority: 1,
        isTemplate: false,
        isRotating: false,
        rotationCycle: undefined,
        rotationStartDate: null,
      })
    }

    if (employee.schedules && employee.schedules.length > 0 && !overwrite) {
      throw new Error(`Employee already has schedules. Set overwrite=true to replace them.`)
    }

    employee.schedules = overwrite ? newSchedules : [...(employee.schedules || []), ...newSchedules]
    await employee.save()
    return newSchedules[0]!
  }

  async getRoleTemplate(roleId: string, _organizationId: string): Promise<RoleTemplate | null> {
    const doc = await RosterTemplate.findOne({
      roleIds: new mongoose.Types.ObjectId(roleId),
    }).sort({ updatedAt: -1 })
    if (!doc || !doc.templateShifts.length) return null
    const ts0 = doc.templateShifts[0]
    const shiftPattern: ShiftPattern = {
      dayOfWeek: [...new Set(doc.templateShifts.map((t) => t.dayOfWeek))].sort((a, b) => a - b),
      startTime: syntheticTime(ts0.startHour),
      endTime: syntheticTime(ts0.endHour),
      locationId: doc.locationId.toString(),
      roleId: roleId,
    }
    return {
      _id: doc._id.toString(),
      roleId,
      organizationId: _organizationId,
      schedule: scheduleFromPattern(shiftPattern),
    }
  }

  async updateRoleTemplate(templateId: string, shiftPattern: ShiftPattern): Promise<RoleTemplate> {
    const doc = await RosterTemplate.findById(templateId)
    if (!doc) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const startHour = hoursFromDate(new Date(shiftPattern.startTime))
    const endHour = hoursFromDate(new Date(shiftPattern.endTime))
    const rid = new mongoose.Types.ObjectId(shiftPattern.roleId)

    doc.templateShifts = shiftPattern.dayOfWeek.map((dayOfWeek) => ({
      dayOfWeek,
      startHour,
      endHour,
      roleId: rid,
    }))
    doc.locationId = new mongoose.Types.ObjectId(shiftPattern.locationId)
    doc.roleIds = [rid]
    await doc.save()

    return this.toRoleTemplate(doc.toObject(), shiftPattern, rid.toString(), "")
  }

  async listRoleTemplates(userId: string, isAdmin: boolean, _organizationId?: string): Promise<RoleTemplate[]> {
    const q = isAdmin
      ? {}
      : {
          $or: [
            { createdBy: new mongoose.Types.ObjectId(userId) },
            { isGlobal: true },
          ],
        }
    const docs = await RosterTemplate.find(q).sort({ updatedAt: -1 })
    return docs.map((doc) => {
      const ts0 = doc.templateShifts[0]
      const roleId = doc.roleIds[0]?.toString() || ""
      const shiftPattern: ShiftPattern = {
        dayOfWeek: [...new Set(doc.templateShifts.map((t) => t.dayOfWeek))].sort((a, b) => a - b),
        startTime: syntheticTime(ts0?.startHour ?? 9),
        endTime: syntheticTime(ts0?.endHour ?? 17),
        locationId: doc.locationId.toString(),
        roleId,
        isRotating: false,
      }
      return this.toRoleTemplate(doc.toObject(), shiftPattern, roleId, _organizationId || "")
    })
  }

  async deleteRoleTemplate(templateId: string): Promise<void> {
    const r = await RosterTemplate.findByIdAndDelete(templateId)
    if (!r) {
      throw new Error(`Template not found: ${templateId}`)
    }
  }

  private toRoleTemplate(
    doc: Record<string, unknown>,
    shiftPattern: ShiftPattern,
    roleId: string,
    organizationId: string
  ): RoleTemplate {
    const d = doc as { _id: mongoose.Types.ObjectId; createdAt?: Date; updatedAt?: Date }
    return {
      _id: d._id.toString(),
      roleId,
      organizationId,
      schedule: scheduleFromPattern(shiftPattern),
    }
  }
}

function syntheticTime(hour: number): Date {
  const d = new Date()
  d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0)
  return d
}

function scheduleFromPattern(shiftPattern: ShiftPattern): ISchedule {
  return {
    _id: new mongoose.Types.ObjectId(),
    dayOfWeek: shiftPattern.dayOfWeek,
    startTime: new Date(shiftPattern.startTime),
    endTime: new Date(shiftPattern.endTime),
    locationId: new mongoose.Types.ObjectId(shiftPattern.locationId),
    roleId: new mongoose.Types.ObjectId(shiftPattern.roleId),
    effectiveFrom: new Date(),
    effectiveTo: null,
    priority: 1,
    isTemplate: true,
    isRotating: shiftPattern.isRotating || false,
    rotationCycle: shiftPattern.rotationCycle,
    rotationStartDate: shiftPattern.rotationStartDate || null,
  }
}
