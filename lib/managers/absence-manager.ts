import mongoose from "mongoose"
import type { ILeaveRecord, IShift } from "@/lib/db/queries/scheduling-types"
import { WorkforceModels } from "@/lib/db/queries/workforce-models"
import { Employee } from "@/lib/db"

/**
 * Absence Manager
 * Handles leave records and roster blocking
 */
export class AbsenceManager {
  /**
   * Create a new leave record
   * @param employeeId - The employee requesting leave
   * @param startDate - Leave start date
   * @param endDate - Leave end date
   * @param leaveType - Type of leave
   * @param notes - Optional notes
   * @returns Created leave record
   */
  async createLeaveRecord(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    leaveType: string,
    notes?: string,
    partial?: { partialStartTime?: string; partialEndTime?: string },
  ): Promise<ILeaveRecord> {
    const emp = await Employee.findById(employeeId).select("tenantId employerId").lean()
    const tenantRaw = (emp as { tenantId?: unknown; employerId?: unknown } | null)?.tenantId
    const employerFallback = (emp as { employerId?: unknown } | null)?.employerId
    const tenantId =
      tenantRaw instanceof mongoose.Types.ObjectId
        ? tenantRaw
        : employerFallback instanceof mongoose.Types.ObjectId
          ? employerFallback
          : typeof tenantRaw === "string" && /^[a-fA-F0-9]{24}$/.test(tenantRaw)
            ? new mongoose.Types.ObjectId(tenantRaw)
            : typeof employerFallback === "string" && /^[a-fA-F0-9]{24}$/.test(employerFallback)
              ? new mongoose.Types.ObjectId(employerFallback)
              : null
    if (!tenantId) {
      throw new Error("Employee has no tenant; cannot create leave record")
    }

    const ps = partial?.partialStartTime?.trim()
    const pe = partial?.partialEndTime?.trim()
    const leaveRecord = await WorkforceModels.LeaveRecord.create({
      tenantId,
      employeeId: new mongoose.Types.ObjectId(employeeId),
      startDate,
      endDate,
      leaveType,
      status: "PENDING",
      notes: notes || "",
      blockAutoFill: true,
      ...(ps && pe ? { partialStartTime: ps, partialEndTime: pe } : { partialStartTime: null, partialEndTime: null }),
    })

    return leaveRecord
  }

  /**
   * Get leave records for an employee within a date range
   * @param employeeId - The employee to query
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of leave records
   */
  async getLeaveRecords(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ILeaveRecord[]> {
    return await WorkforceModels.LeaveRecord.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      $or: [
        // Leave starts within range
        { startDate: { $gte: startDate, $lte: endDate } },
        // Leave ends within range
        { endDate: { $gte: startDate, $lte: endDate } },
        // Leave spans entire range
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    }).sort({ startDate: 1 })
  }

  /**
   * Check if an employee is available on a specific date
   * @param employeeId - The employee to check
   * @param date - The date to check
   * @returns True if available, false if on leave
   */
  async isEmployeeAvailable(
    employeeId: string,
    date: Date
  ): Promise<boolean> {
    // Query for approved leave records that overlap this date
    const leaveRecords = await WorkforceModels.LeaveRecord.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      status: "APPROVED",
      startDate: { $lte: date },
      endDate: { $gte: date },
    })

    return leaveRecords.length === 0
  }

  /**
   * Block shifts for an approved leave period
   * @param leaveRecordId - The leave record to process
   */
  async blockShiftsForLeave(leaveRecordId: string): Promise<void> {
    const leaveRecord = await WorkforceModels.LeaveRecord.findById(leaveRecordId)
    if (!leaveRecord) {
      throw new Error(`Leave record not found: ${leaveRecordId}`)
    }

    if (leaveRecord.status !== "APPROVED") {
      throw new Error(`Leave record is not approved`)
    }

    // Find all rosters that overlap with the leave period
    const rosters = await WorkforceModels.Roster.find({
      weekStartDate: { $lte: leaveRecord.endDate },
      weekEndDate: { $gte: leaveRecord.startDate },
    })

    // Process each roster
    for (const roster of rosters) {
      let modified = false

      for (const shift of roster.shifts) {
        // Check if this shift belongs to the employee and falls within leave period
        if (
          shift.employeeId?.toString() === leaveRecord.employeeId.toString() &&
          shift.date >= leaveRecord.startDate &&
          shift.date <= leaveRecord.endDate
        ) {
          // Mark shift as requiring replacement
          shift.notes = `${shift.notes ? shift.notes + " | " : ""}Employee on leave - replacement needed`
          
          // Decrement current staff count
          if (shift.currentStaffCount && shift.currentStaffCount > 0) {
            shift.currentStaffCount--
          }

          // Mark as understaffed if needed
          const requiredCount = shift.requiredStaffCount || 1
          const currentCount = shift.currentStaffCount || 0
          shift.isUnderstaffed = currentCount < requiredCount

          modified = true
        }
      }

      if (modified) {
        await roster.save()
      }
    }
  }

  /**
   * Identify shifts that need replacement due to leave
   * @param leaveRecordId - The leave record to analyze
   * @returns Array of shifts requiring replacement
   */
  async identifyReplacementNeeds(leaveRecordId: string): Promise<IShift[]> {
    const leaveRecord = await WorkforceModels.LeaveRecord.findById(leaveRecordId)
    if (!leaveRecord) {
      throw new Error(`Leave record not found: ${leaveRecordId}`)
    }

    // Find all rosters that overlap with the leave period
    const rosters = await WorkforceModels.Roster.find({
      weekStartDate: { $lte: leaveRecord.endDate },
      weekEndDate: { $gte: leaveRecord.startDate },
    })

    const affectedShifts: IShift[] = []

    // Collect all shifts that will be affected
    for (const roster of rosters) {
      for (const shift of roster.shifts) {
        if (
          shift.employeeId?.toString() === leaveRecord.employeeId.toString() &&
          shift.date >= leaveRecord.startDate &&
          shift.date <= leaveRecord.endDate
        ) {
          affectedShifts.push(shift)
        }
      }
    }

    return affectedShifts
  }

  /**
   * Approve a leave record
   * @param leaveRecordId - The leave record to approve
   * @param approverId - The user approving the leave
   */
  async approveLeaveRecord(
    leaveRecordId: string,
    approverId: string
  ): Promise<ILeaveRecord> {
    const leaveRecord = await WorkforceModels.LeaveRecord.findById(leaveRecordId)
    if (!leaveRecord) {
      throw new Error(`Leave record not found: ${leaveRecordId}`)
    }

    if (leaveRecord.status !== "PENDING") {
      throw new Error(`Leave record is not in PENDING status`)
    }

    leaveRecord.status = "APPROVED"
    leaveRecord.approvedBy = new mongoose.Types.ObjectId(approverId)
    leaveRecord.approvedAt = new Date()

    await leaveRecord.save()

    // Automatically block shifts for this leave period
    await this.blockShiftsForLeave(leaveRecordId)

    return leaveRecord
  }

  /**
   * Deny a leave record
   * @param leaveRecordId - The leave record to deny
   * @param denierId - The user denying the leave
   * @param reason - Reason for denial
   */
  async denyLeaveRecord(
    leaveRecordId: string,
    denierId: string,
    reason: string
  ): Promise<ILeaveRecord> {
    const leaveRecord = await WorkforceModels.LeaveRecord.findById(leaveRecordId)
    if (!leaveRecord) {
      throw new Error(`Leave record not found: ${leaveRecordId}`)
    }

    if (leaveRecord.status !== "PENDING") {
      throw new Error(`Leave record is not in PENDING status`)
    }

    leaveRecord.status = "DENIED"
    leaveRecord.deniedBy = new mongoose.Types.ObjectId(denierId)
    leaveRecord.deniedAt = new Date()
    leaveRecord.denialReason = reason

    await leaveRecord.save()
    return leaveRecord
  }
}
