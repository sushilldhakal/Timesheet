import mongoose from "mongoose"
import { Timesheet, ITimesheet, ITimesheetDocument } from "../db/schemas/timesheet"
import { Roster, IShift } from "../db/schemas/roster"
import { calculateWeekId } from "../db/schemas/roster"

export interface TimesheetManagerResult {
  success: boolean
  error?: string
  message?: string
  timesheet?: ITimesheetDocument
  timesheets?: ITimesheetDocument[]
  pairs?: any[]
  shiftMatched?: boolean
}

/**
 * TimesheetManager
 * Business logic for timesheet operations including shift linking
 */
export class TimesheetManager {
  /**
   * Link a timesheet to a roster shift
   */
  async linkTimesheetToShift(
    timesheetId: string,
    shiftId: string
  ): Promise<TimesheetManagerResult> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(timesheetId)) {
        return {
          success: false,
          error: "INVALID_TIMESHEET_ID",
          message: "Invalid timesheet ID format",
        }
      }

      if (!mongoose.Types.ObjectId.isValid(shiftId)) {
        return {
          success: false,
          error: "INVALID_SHIFT_ID",
          message: "Invalid shift ID format",
        }
      }

      // Find and update timesheet
      const timesheet = await Timesheet.findById(timesheetId)

      if (!timesheet) {
        return {
          success: false,
          error: "TIMESHEET_NOT_FOUND",
          message: "Timesheet not found",
        }
      }

      timesheet.scheduleShiftId = new mongoose.Types.ObjectId(shiftId)
      await timesheet.save()

      return {
        success: true,
        timesheet,
      }
    } catch (err) {
      console.error("[TimesheetManager.linkTimesheetToShift]", err)
      return {
        success: false,
        error: "LINK_FAILED",
        message: err instanceof Error ? err.message : "Failed to link timesheet to shift",
      }
    }
  }

  /**
   * Get all timesheets linked to a specific shift
   */
  async getTimesheetsForShift(shiftId: string): Promise<TimesheetManagerResult> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(shiftId)) {
        return {
          success: false,
          error: "INVALID_SHIFT_ID",
          message: "Invalid shift ID format",
        }
      }

      // Find all timesheets linked to this shift
      const timesheets = await Timesheet.find({ scheduleShiftId: shiftId }).sort({ date: 1, time: 1 })

      return {
        success: true,
        timesheets,
      }
    } catch (err) {
      console.error("[TimesheetManager.getTimesheetsForShift]", err)
      return {
        success: false,
        error: "FETCH_FAILED",
        message: err instanceof Error ? err.message : "Failed to fetch timesheets for shift",
      }
    }
  }

  /**
   * Get timesheets for a date range with optional filters
   */
  async getTimesheetsForDateRange(
    startDate: string,
    endDate: string,
    options?: {
      pin?: string
      type?: string
      sortBy?: "date" | "pin" | "time"
      sortOrder?: "asc" | "desc"
    }
  ): Promise<TimesheetManagerResult> {
    try {
      const query: any = {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      }

      if (options?.pin) {
        query.pin = options.pin
      }

      if (options?.type) {
        query.type = options.type
      }

      // Build sort object
      const sort: any = {}
      const sortBy = options?.sortBy || "date"
      const sortOrder = options?.sortOrder === "desc" ? -1 : 1

      sort[sortBy] = sortOrder

      // Execute query
      const timesheets = await Timesheet.find(query).sort(sort)

      return {
        success: true,
        timesheets,
      }
    } catch (err) {
      console.error("[TimesheetManager.getTimesheetsForDateRange]", err)
      return {
        success: false,
        error: "FETCH_FAILED",
        message: err instanceof Error ? err.message : "Failed to fetch timesheets",
      }
    }
  }

  /**
   * Get timesheet pairs (clock-in/clock-out) for payroll processing
   */
  async getTimesheetPairsForPayroll(
    startDate: string,
    endDate: string
  ): Promise<TimesheetManagerResult> {
    try {
      // Fetch all timesheets in date range
      const timesheets = await Timesheet.find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ pin: 1, date: 1, time: 1 })

      // Group timesheets by pin and date
      const grouped = new Map<string, ITimesheetDocument[]>()

      for (const timesheet of timesheets) {
        const key = `${timesheet.pin}:${timesheet.date}`
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key)!.push(timesheet)
      }

      // Create pairs from grouped timesheets
      const pairs: any[] = []

      for (const [key, entries] of grouped.entries()) {
        const [pin, date] = key.split(":")

        // Find clock-in and clock-out entries
        const clockIn = entries.find((e) => e.type === "in")
        const clockOut = entries.find((e) => e.type === "out")

        if (clockIn || clockOut) {
          pairs.push({
            pin,
            date,
            clockIn: clockIn || null,
            clockOut: clockOut || null,
            scheduleShiftId: clockIn?.scheduleShiftId || clockOut?.scheduleShiftId || null,
          })
        }
      }

      return {
        success: true,
        pairs,
      }
    } catch (err) {
      console.error("[TimesheetManager.getTimesheetPairsForPayroll]", err)
      return {
        success: false,
        error: "FETCH_FAILED",
        message: err instanceof Error ? err.message : "Failed to fetch timesheet pairs",
      }
    }
  }

  /**
   * Automatically match a timesheet to a roster shift
   * Based on employee pin, date, and time proximity
   */
  async autoMatchTimesheetToShift(
    timesheet: ITimesheetDocument
  ): Promise<{ matched: boolean; shiftId?: mongoose.Types.ObjectId }> {
    try {
      // Only auto-match clock-in entries
      if (timesheet.type !== "in") {
        return { matched: false }
      }

      // Calculate week ID from date
      const timesheetDate = new Date(timesheet.date)
      const weekId = calculateWeekId(timesheetDate)

      // Find roster for this week
      const roster = await Roster.findOne({ weekId }).lean()

      if (!roster || !roster.shifts || roster.shifts.length === 0) {
        return { matched: false }
      }

      // Convert timesheet date string to Date for comparison
      const timesheetDateStr = timesheet.date // Format: YYYY-MM-DD or dd-MM-yyyy

      // Find matching shift for this employee on this date
      const matchingShift = roster.shifts.find((shift: IShift) => {
        // Convert shift date to string for comparison
        const shiftDateStr = shift.date instanceof Date 
          ? shift.date.toISOString().split('T')[0] 
          : String(shift.date)

        // Check if shift matches date
        if (shiftDateStr !== timesheetDateStr && 
            !this.datesMatch(shift.date, timesheetDateStr)) {
          return false
        }

        // If timesheet has time, check proximity (within 2 hours of shift start)
        if (timesheet.time && shift.startTime) {
          const timesheetMinutes = this.timeToMinutes(timesheet.time)
          const shiftStartDate = shift.startTime instanceof Date ? shift.startTime : new Date(shift.startTime)
          const shiftMinutes = shiftStartDate.getHours() * 60 + shiftStartDate.getMinutes()

          // Allow clock-in up to 2 hours before or after shift start
          const diff = Math.abs(timesheetMinutes - shiftMinutes)
          return diff <= 120 // 2 hours = 120 minutes
        }

        return true
      })

      if (matchingShift && matchingShift._id) {
        // Update timesheet with matched shift ID
        timesheet.scheduleShiftId = matchingShift._id
        await timesheet.save()

        return {
          matched: true,
          shiftId: matchingShift._id,
        }
      }

      return { matched: false }
    } catch (err) {
      console.error("[TimesheetManager.autoMatchTimesheetToShift]", err)
      return { matched: false }
    }
  }

  /**
   * Helper: Check if two dates match (handles different formats)
   */
  private datesMatch(date1: Date | string, date2: string): boolean {
    try {
      const d1 = date1 instanceof Date ? date1 : new Date(date1)
      const d2 = new Date(date2)
      
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate()
    } catch {
      return false
    }
  }

  /**
   * Helper: Convert time string (HH:mm) to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }
}
