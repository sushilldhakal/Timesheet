import mongoose from "mongoose"
import { Employee } from "@/lib/db/schemas/employee"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Timesheet } from "@/lib/db/schemas/timesheet"

export type TimesheetEmployeeMeta = {
  id: string
  name: string
  employer: string
  role: string
  location: string
  comment: string
}

export class MongoTimesheetDbQueries {
  static async findEmployeesByIds(employeeIds: string[]) {
    return Employee.find({ _id: { $in: employeeIds } }).lean()
  }

  static async findEmployeesForDashboard(filter: Record<string, unknown>) {
    return Employee.find(filter).lean()
  }

  static async findActiveRoleAssignments(employeeIds: Array<string | mongoose.Types.ObjectId>) {
    const { EmployeeTeamAssignment } = await import("@/lib/db/schemas/employee-team-assignment")
    return EmployeeTeamAssignment.find({
      employeeId: { $in: employeeIds },
      isActive: true,
    })
      .populate("teamId", "name")
      .lean()
  }

  static async findDailyShiftsForPins(opts: {
    tenantId: string
    pins: string[]
    startUTC: Date
    endUTC: Date
  }) {
    return DailyShift.find({
      tenantId: new mongoose.Types.ObjectId(opts.tenantId),
      pin: { $in: opts.pins },
      date: { $gte: opts.startUTC, $lte: opts.endUTC },
    }).lean()
  }

  static async findTimesheetDuplicate(opts: {
    tenantId: string
    employeeId: string
    payPeriodStart: Date
    payPeriodEnd: Date
  }) {
    return Timesheet.findOne({
      tenantId: opts.tenantId,
      employeeId: opts.employeeId,
      payPeriodStart: opts.payPeriodStart,
      payPeriodEnd: opts.payPeriodEnd,
    })
  }

  static async findShiftsForEmployeePayPeriod(opts: {
    tenantId: string
    employeeId: string
    startUTC: Date
    endUTC: Date
  }) {
    return DailyShift.find({
      tenantId: opts.tenantId,
      employeeId: opts.employeeId,
      date: { $gte: opts.startUTC, $lte: opts.endUTC },
      status: { $in: ["active", "completed", "approved"] },
    }).lean()
  }

  static async createTimesheet(doc: {
    tenantId: string
    employeeId: string
    payPeriodStart: Date
    payPeriodEnd: Date
    shiftIds: unknown[]
    totalShifts: number
    totalHours: number
    totalCost: number
    totalBreakMinutes: number
    status: "draft" | "submitted" | "approved" | "rejected" | "locked"
  }) {
    return Timesheet.create(doc)
  }

  static async findTimesheetByIdPopulated(id: string) {
    return Timesheet.findById(id)
      .populate("employeeId", "name pin email")
      .populate("submittedBy", "email")
      .populate("approvedBy", "email")
      .populate("rejectedBy", "email")
      .populate("lockedBy", "email")
      .lean()
  }

  static async findDailyShiftsByIds(shiftIds: unknown[]) {
    return DailyShift.find({ _id: { $in: shiftIds } }).sort({ date: 1 }).lean()
  }

  static async findTimesheetById(id: string) {
    return Timesheet.findById(id)
  }

  static async findDailyShiftByIdPopulatedEmployee(id: string) {
    return DailyShift.findById(id).populate("employeeId")
  }

  static async findEmployeeById(id: string) {
    return Employee.findById(id)
  }

  static async findAwardById(id: string) {
    const Award = (await import("@/lib/db/schemas/award")).default
    return Award.findById(id)
  }

  static async findWeeklyShiftsBeforeDate(opts: { employeeId: string; startOfWeek: Date; shiftDate: Date }) {
    return DailyShift.find({
      employeeId: opts.employeeId,
      date: { $gte: opts.startOfWeek, $lt: opts.shiftDate },
      status: { $ne: "rejected" },
    })
  }

  /** Roster documents that contain any of the given embedded shift `_id`s (schedule enrichment). */
  static async aggregateRosterShiftsForTenant(tenantId: string, rosterShiftIds: string[]) {
    if (rosterShiftIds.length === 0) return []
    const { Roster } = await import("@/lib/db/schemas/roster")
    const oids = rosterShiftIds.map((id) => new mongoose.Types.ObjectId(String(id)))
    const tenantOid = new mongoose.Types.ObjectId(tenantId)
    return Roster.aggregate([
      { $match: { tenantId: tenantOid, "shifts._id": { $in: oids } } },
      { $project: { shifts: 1 } },
    ])
  }
}
