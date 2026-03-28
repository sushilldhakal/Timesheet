import mongoose from "mongoose"
import { addDays } from "date-fns"
import { Roster, IShift } from "../db/schemas/roster"
import { Employee, IEmployeeDocument } from "../db/schemas/employee"
import { EmployeeRoleAssignment } from "../db/schemas/employee-role-assignment"
import { Category } from "../db/schemas/category"
import { AvailabilityConstraint } from "../db/schemas/availability-constraint"
import { WorkingHoursHierarchy, WorkingHoursConfig } from "./working-hours-hierarchy"
import { AvailabilityManager } from "./availability-manager"
import { ComplianceManager } from "./compliance-manager"
import { AbsenceManager } from "./absence-manager"
import { SchedulingValidator } from "../validations/scheduling-validator"
import { RosterManager } from "./roster-manager"

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACT"

export interface SkippedEmployeeDetail {
  employeeId: string
  employeeName: string
  reason: string
}

export interface RosterFillResult {
  successCount: number
  failureCount: number
  skippedCount: number
  violations: Array<{
    employeeId: string
    employeeName: string
    date: Date
    violations: string[]
  }>
  skippedEmployees: SkippedEmployeeDetail[]
}

function employmentMatches(empType: string | null | undefined, types: EmploymentType[]): boolean {
  if (!types.length) return true
  if (!empType) return false
  const n = empType.toLowerCase().replace(/[\s_-]/g, "")
  for (const t of types) {
    const key = t.toLowerCase().replace(/_/g, "")
    if (key === "fulltime" && n.includes("full") && !n.includes("part")) return true
    if (key === "parttime" && n.includes("part")) return true
    if (key === "casual" && n.includes("casual")) return true
    if (key === "contract" && n.includes("contract")) return true
  }
  return false
}

function shiftHours(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60))
}

/**
 * Auto-Fill Engine — scoped by location + managed roles; uses ERA, hours budget, location hours, availability.
 */
export class AutoFillEngine {
  private workingHoursHierarchy: WorkingHoursHierarchy
  private availabilityManager: AvailabilityManager
  private complianceManager: ComplianceManager
  private absenceManager: AbsenceManager
  private schedulingValidator: SchedulingValidator
  private rosterManager: RosterManager

  constructor() {
    this.workingHoursHierarchy = new WorkingHoursHierarchy()
    this.availabilityManager = new AvailabilityManager()
    this.complianceManager = new ComplianceManager()
    this.absenceManager = new AbsenceManager()
    this.schedulingValidator = new SchedulingValidator()
    this.rosterManager = new RosterManager()
  }

  async fillRoster(
    rosterId: string,
    locationId: string,
    managedRoleIds: string[],
    employmentTypes: EmploymentType[] = ["FULL_TIME", "PART_TIME"]
  ): Promise<RosterFillResult> {
    const result: RosterFillResult = {
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      violations: [],
      skippedEmployees: [],
    }

    const locOid = new mongoose.Types.ObjectId(locationId)
    const roleOids = managedRoleIds.map((id) => new mongoose.Types.ObjectId(id))
    if (roleOids.length === 0) {
      return result
    }

    const roster = await Roster.findById(rosterId)
    if (!roster) {
      throw new Error(`Roster not found: ${rosterId}`)
    }

    const location = await Category.findById(locOid)
    if (!location || location.type !== "location") {
      throw new Error(`Location not found: ${locationId}`)
    }

    const locationStartHour = location.openingHour ?? 0
    const locationEndHour = location.closingHour ?? 24
    const locationWorkingDays = location.workingDays?.length ? location.workingDays : [1, 2, 3, 4, 5]

    const assignments = await EmployeeRoleAssignment.find({
      locationId: locOid,
      roleId: { $in: roleOids },
      isActive: true,
    }).lean()

    const employeeIds = Array.from(new Set(assignments.map((a) => a.employeeId.toString())))
    const employees = await Employee.find({ _id: { $in: employeeIds.map((id) => new mongoose.Types.ObjectId(id)) } })

    const constraints = await AvailabilityConstraint.find({
      employeeId: { $in: employeeIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean()

    const unavailableByEmployee = new Map<string, Set<number>>()
    for (const c of constraints) {
      const eid = c.employeeId.toString()
      if (!unavailableByEmployee.has(eid)) unavailableByEmployee.set(eid, new Set())
      for (const d of c.unavailableDays || []) {
        if (d >= 0 && d <= 6) unavailableByEmployee.get(eid)!.add(d)
      }
    }

    const hoursUsedThisWeek = new Map<string, number>()

    for (const employee of employees) {
      if (!employmentMatches(employee.employmentType, employmentTypes)) {
        result.skippedEmployees.push({
          employeeId: employee._id.toString(),
          employeeName: employee.name,
          reason: "Employment type not selected",
        })
        result.skippedCount++
        continue
      }

      const workingHours = await this.workingHoursHierarchy.resolveWorkingHours(employee._id.toString())
      if (!workingHours) {
        result.skippedEmployees.push({
          employeeId: employee._id.toString(),
          employeeName: employee.name,
          reason: "No working hours configuration",
        })
        result.skippedCount++
        continue
      }

      const standardHoursPerWeek =
        employee.standardHoursPerWeek ?? workingHours.standardHoursPerWeek ?? 38

      const empAssignments = assignments.filter((a) => a.employeeId.toString() === employee._id.toString())

      for (const a of empAssignments) {
        if (!roleOids.some((r) => r.equals(a.roleId as mongoose.Types.ObjectId))) continue

        const role = await Category.findById(a.roleId)
        if (!role || role.type !== "role") continue

        await this.fillForAssignment({
          employee,
          roster,
          workingHours,
          role,
          locationDoc: location,
          locationStartHour,
          locationEndHour,
          locationWorkingDays,
          standardHoursPerWeek,
          unavailable: unavailableByEmployee.get(employee._id.toString()) ?? new Set(),
          hoursUsedThisWeek,
          result,
        })
      }
    }

    await roster.save()
    return result
  }

  private async fillForAssignment(ctx: {
    employee: IEmployeeDocument
    roster: mongoose.Document & { weekStartDate: Date; weekEndDate: Date; shifts: IShift[] }
    workingHours: WorkingHoursConfig
    role: mongoose.Document & { _id: mongoose.Types.ObjectId; defaultScheduleTemplate?: { shiftPattern?: { dayOfWeek?: number[]; startHour?: number; endHour?: number }; standardHoursPerWeek?: number } }
    locationDoc: mongoose.Document & { _id: mongoose.Types.ObjectId; openingHour?: number; closingHour?: number; workingDays?: number[] }
    locationStartHour: number
    locationEndHour: number
    locationWorkingDays: number[]
    standardHoursPerWeek: number
    unavailable: Set<number>
    hoursUsedThisWeek: Map<string, number>
    result: RosterFillResult
  }): Promise<void> {
    const {
      employee,
      roster,
      workingHours,
      role,
      locationStartHour,
      locationEndHour,
      locationWorkingDays,
      standardHoursPerWeek,
      unavailable,
      hoursUsedThisWeek,
      result,
    } = ctx

    const weekStartDate = new Date(roster.weekStartDate)
    const weekEndDate = new Date(roster.weekEndDate)
    const empKey = employee._id.toString()
    let roleDays: number[] = []
    let roleStartHour = 9
    let roleEndHour = 17

    if (workingHours.source === "employee" && workingHours.shiftPattern) {
      const sch = workingHours.shiftPattern as { dayOfWeek?: number[]; startTime?: Date; endTime?: Date; locationId?: mongoose.Types.ObjectId; roleId?: mongoose.Types.ObjectId }
      const locMatch = sch.locationId?.toString() === ctx.locationDoc._id.toString()
      const roleMatch = sch.roleId?.equals(role._id)
      if (locMatch && roleMatch && sch.dayOfWeek?.length) {
        roleDays = [...sch.dayOfWeek]
        if (sch.startTime) roleStartHour = sch.startTime.getHours() + sch.startTime.getMinutes() / 60
        if (sch.endTime) roleEndHour = sch.endTime.getHours() + sch.endTime.getMinutes() / 60
      }
    }

    if (roleDays.length === 0) {
      const tpl = role.defaultScheduleTemplate
      const pattern = tpl?.shiftPattern
      if (!pattern?.dayOfWeek?.length) {
        result.skippedEmployees.push({
          employeeId: empKey,
          employeeName: employee.name,
          reason: `No shift pattern for role ${role._id}`,
        })
        result.skippedCount++
        return
      }
      roleDays = pattern.dayOfWeek
      roleStartHour = pattern.startHour ?? 9
      roleEndHour = pattern.endHour ?? 17
    }

    const workableDays = roleDays.filter((day) => locationWorkingDays.includes(day))
    if (workableDays.length === 0) {
      result.skippedEmployees.push({
        employeeId: empKey,
        employeeName: employee.name,
        reason: "No workable days (role vs location)",
      })
      result.skippedCount++
      return
    }

    const shiftStartHour = Math.max(roleStartHour, locationStartHour)
    const shiftEndHour = Math.min(roleEndHour, locationEndHour)
    if (shiftStartHour >= shiftEndHour) {
      result.skippedEmployees.push({
        employeeId: empKey,
        employeeName: employee.name,
        reason: "Role hours do not overlap location hours",
      })
      result.skippedCount++
      return
    }

    const hoursPerFullShift = shiftEndHour - shiftStartHour
    const employmentType = (employee.employmentType || "").toUpperCase()
    const isCasual = employmentType.includes("CASUAL")

    let shiftsNeeded: number
    let daysToSchedule: number[]
    if (isCasual) {
      daysToSchedule = [...workableDays]
      shiftsNeeded = daysToSchedule.length
    } else {
      shiftsNeeded = Math.min(workableDays.length, Math.ceil(standardHoursPerWeek / hoursPerFullShift))
      daysToSchedule = workableDays.slice(0, shiftsNeeded)
    }

    for (const dayOfWeek of daysToSchedule) {
      let used = hoursUsedThisWeek.get(empKey) ?? 0
      if (used >= standardHoursPerWeek - 1e-6 && !isCasual) break

      const shiftDate = addDays(weekStartDate, dayOfWeek === 0 ? 6 : dayOfWeek - 1)
      if (shiftDate < weekStartDate || shiftDate > weekEndDate) continue

      const jsDay = shiftDate.getDay()
      if (unavailable.has(jsDay)) {
        result.skippedCount++
        continue
      }

      const availableForWork = await this.absenceManager.isEmployeeAvailable(employee._id.toString(), shiftDate)
      if (!availableForWork) {
        result.skippedCount++
        continue
      }

      let blockStart = shiftStartHour
      let blockEnd = shiftEndHour
      let durationHours = blockEnd - blockStart
      if (!isCasual) {
        const remaining = standardHoursPerWeek - used
        if (remaining <= 0) break
        if (remaining < durationHours) {
          durationHours = remaining
          blockEnd = blockStart + durationHours
        }
      }

      const shiftStartTime = new Date(shiftDate)
      shiftStartTime.setHours(Math.floor(blockStart), Math.round((blockStart % 1) * 60), 0, 0)
      const shiftEndTime = new Date(shiftDate)
      shiftEndTime.setHours(Math.floor(blockEnd), Math.round((blockEnd % 1) * 60), 0, 0)

      const validation = await this.schedulingValidator.validateShift(
        employee._id,
        role._id,
        ctx.locationDoc._id,
        shiftDate
      )
      if (!validation.valid) {
        result.skippedEmployees.push({
          employeeId: empKey,
          employeeName: employee.name,
          reason: validation.message || validation.error || "Scheduling validation failed",
        })
        result.skippedCount++
        continue
      }

      const orgKey = employee.employer?.[0] ?? ""
      const availabilityValidation = await this.availabilityManager.validateShiftAssignment(
        employee._id,
        shiftStartTime,
        shiftEndTime,
        orgKey
      )
      const complianceViolations = await this.complianceManager.validateShiftAssignment(
        employee._id,
        shiftStartTime,
        shiftEndTime,
        orgKey
      )
      const allViolations = [
        ...availabilityValidation.violations,
        ...complianceViolations.map((v) => v.message),
      ]
      if (allViolations.length > 0) {
        result.failureCount++
        result.violations.push({
          employeeId: empKey,
          employeeName: employee.name,
          date: shiftDate,
          violations: allViolations,
        })
        continue
      }

      const estimatedCost = await this.rosterManager.calculateShiftCost(
        {
          employeeId: employee._id,
          date: shiftDate,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          locationId: ctx.locationDoc._id,
          roleId: role._id,
        },
        employee
      )

      const newShift: IShift = {
        _id: new mongoose.Types.ObjectId(),
        employeeId: employee._id,
        date: shiftDate,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        locationId: ctx.locationDoc._id,
        roleId: role._id,
        sourceScheduleId: null,
        estimatedCost,
        notes: "",
        requiredStaffCount: 1,
        currentStaffCount: 1,
        isUnderstaffed: false,
        status: "draft",
      }

      roster.shifts.push(newShift)
      hoursUsedThisWeek.set(empKey, used + shiftHours(shiftStartTime, shiftEndTime))
      result.successCount++
    }
  }
}
