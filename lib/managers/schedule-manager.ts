import mongoose from "mongoose"
import { Employee, IEmployeeDocument } from "../db/schemas/employee"
import { ISchedule } from "../db/schemas/schedule"
import { validateSchedule } from "@/lib/utils/validation/schedule-validation"

/**
 * Schedule Manager
 * Responsible for managing recurring weekly work patterns on employee documents
 */
export class ScheduleManager {
  /**
   * Create a new schedule for an employee
   * @param employeeId - The employee's ObjectId
   * @param scheduleData - The schedule data to create
   * @returns The created schedule or error
   */
  async createSchedule(
    employeeId: mongoose.Types.ObjectId | string,
    scheduleData: Omit<ISchedule, "_id">
  ): Promise<{ success: true; schedule: ISchedule } | { success: false; error: string; message: string }> {
    try {
      // Validate schedule data
      const validationResult = await validateSchedule(scheduleData)
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          message: validationResult.message,
        }
      }

      // Find the employee
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return {
          success: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        }
      }

      // Create new schedule with generated _id
      const newSchedule = {
        _id: new mongoose.Types.ObjectId(),
        ...scheduleData,
      } as ISchedule

      // Add schedule to employee's schedules array
      if (!employee.schedules) {
        employee.schedules = []
      }
      employee.schedules.push(newSchedule)

      // Save employee
      await employee.save()

      return {
        success: true,
        schedule: newSchedule,
      }
    } catch (error) {
      return {
        success: false,
        error: "CREATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to create schedule",
      }
    }
  }

  /**
   * Update an existing schedule for an employee
   * @param employeeId - The employee's ObjectId
   * @param scheduleId - The schedule's ObjectId
   * @param scheduleData - The updated schedule data
   * @returns The updated schedule or error
   */
  async updateSchedule(
    employeeId: mongoose.Types.ObjectId | string,
    scheduleId: mongoose.Types.ObjectId | string,
    scheduleData: Partial<Omit<ISchedule, "_id">>
  ): Promise<{ success: true; schedule: ISchedule } | { success: false; error: string; message: string }> {
    try {
      // Find the employee
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return {
          success: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        }
      }

      // Find the schedule
      const schedule = employee.schedules?.find(
        (s) => s._id.toString() === scheduleId.toString()
      )
      if (!schedule) {
        return {
          success: false,
          error: "SCHEDULE_NOT_FOUND",
          message: "Schedule not found",
        }
      }

      // Merge updated data with existing schedule
      const updatedSchedule = {
        _id: schedule._id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        locationId: schedule.locationId,
        roleId: schedule.roleId,
        effectiveFrom: schedule.effectiveFrom,
        effectiveTo: schedule.effectiveTo,
        ...scheduleData,
      }

      // Validate updated schedule
      const validationResult = await validateSchedule(updatedSchedule)
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          message: validationResult.message,
        }
      }

      // Update schedule fields
      Object.assign(schedule, scheduleData)

      // Save employee
      await employee.save()

      return {
        success: true,
        schedule: schedule as ISchedule,
      }
    } catch (error) {
      return {
        success: false,
        error: "UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to update schedule",
      }
    }
  }

  /**
   * Delete a schedule from an employee
   * @param employeeId - The employee's ObjectId
   * @param scheduleId - The schedule's ObjectId
   * @returns Success status or error
   */
  async deleteSchedule(
    employeeId: mongoose.Types.ObjectId | string,
    scheduleId: mongoose.Types.ObjectId | string
  ): Promise<{ success: true } | { success: false; error: string; message: string }> {
    try {
      // Find the employee
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return {
          success: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        }
      }

      // Find the schedule index
      const scheduleIndex = employee.schedules?.findIndex(
        (s) => s._id.toString() === scheduleId.toString()
      )
      if (scheduleIndex === undefined || scheduleIndex === -1) {
        return {
          success: false,
          error: "SCHEDULE_NOT_FOUND",
          message: "Schedule not found",
        }
      }

      // Remove schedule from array
      employee.schedules?.splice(scheduleIndex, 1)

      // Save employee
      await employee.save()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: "DELETE_FAILED",
        message: error instanceof Error ? error.message : "Failed to delete schedule",
      }
    }
  }

  /**
   * Get active schedules for an employee on a specific date
   * Applies overlap resolution: most recent effectiveFrom wins
   * @param employeeId - The employee's ObjectId
   * @param date - The date to check for active schedules
   * @returns Array of active schedules
   */
  async getActiveSchedules(
    employeeId: mongoose.Types.ObjectId | string,
    date: Date
  ): Promise<{ success: true; schedules: ISchedule[] } | { success: false; error: string; message: string }> {
    try {
      // Find the employee
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return {
          success: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        }
      }

      if (!employee.schedules || employee.schedules.length === 0) {
        return {
          success: true,
          schedules: [],
        }
      }

      // Filter schedules that are active on the given date
      const activeSchedules = employee.schedules.filter((schedule) => {
        const effectiveFrom = new Date(schedule.effectiveFrom)
        const effectiveTo = schedule.effectiveTo ? new Date(schedule.effectiveTo) : null

        // Check if date falls within [effectiveFrom, effectiveTo]
        const isAfterStart = date >= effectiveFrom
        const isBeforeEnd = effectiveTo === null || date <= effectiveTo

        return isAfterStart && isBeforeEnd
      })

      // If multiple schedules overlap, apply the one with most recent effectiveFrom
      // Group by dayOfWeek to handle overlaps
      const schedulesByDay = new Map<number, ISchedule>()

      for (const schedule of activeSchedules) {
        for (const day of schedule.dayOfWeek) {
          const existing = schedulesByDay.get(day)
          if (!existing) {
            schedulesByDay.set(day, schedule)
          } else {
            // Compare effectiveFrom dates - most recent wins
            const existingFrom = new Date(existing.effectiveFrom)
            const currentFrom = new Date(schedule.effectiveFrom)
            if (currentFrom > existingFrom) {
              schedulesByDay.set(day, schedule)
            }
          }
        }
      }

      // Get unique schedules (a schedule might cover multiple days)
      const uniqueSchedules = Array.from(
        new Map(
          Array.from(schedulesByDay.values()).map((s) => [s._id.toString(), s])
        ).values()
      )

      return {
        success: true,
        schedules: uniqueSchedules,
      }
    } catch (error) {
      return {
        success: false,
        error: "QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get active schedules",
      }
    }
  }

  /**
   * Validate schedule data
   * @param scheduleData - The schedule data to validate
   * @returns Validation result
   */
  async validateSchedule(
    scheduleData: Partial<ISchedule>
  ): Promise<{ success: true } | { success: false; error: string; message: string }> {
    const result = await validateSchedule(scheduleData)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.message,
      }
    }
    return { success: true }
  }
}
