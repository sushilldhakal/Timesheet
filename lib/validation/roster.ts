import mongoose from "mongoose"
import { IShift } from "../db/schemas/roster"

/**
 * Validation error types for roster operations
 */
export type RosterValidationError =
  | "DUPLICATE_WEEK"
  | "INVALID_WEEK_FORMAT"
  | "INVALID_STATUS"
  | "SHIFT_DATE_OUT_OF_BOUNDS"
  | "INVALID_TIME_FORMAT"
  | "INVALID_TIME_ORDER"
  | "INVALID_EMPLOYEE_REF"
  | "INVALID_LOCATION_REF"
  | "INVALID_ROLE_REF"

export interface ValidationResult {
  valid: boolean
  error?: RosterValidationError
  message?: string
}

/**
 * Validate week ID format (YYYY-Www)
 */
export function validateWeekIdFormat(weekId: string): ValidationResult {
  const weekIdPattern = /^\d{4}-W\d{2}$/
  if (!weekIdPattern.test(weekId)) {
    return {
      valid: false,
      error: "INVALID_WEEK_FORMAT",
      message: "weekId must match format YYYY-Www (e.g., 2024-W15)",
    }
  }
  return { valid: true }
}

/**
 * Validate roster status
 */
export function validateRosterStatus(status: string): ValidationResult {
  if (status !== "draft" && status !== "published") {
    return {
      valid: false,
      error: "INVALID_STATUS",
      message: 'status must be either "draft" or "published"',
    }
  }
  return { valid: true }
}

/**
 * Validate shift date falls within week boundaries
 */
export function validateShiftDateBoundary(
  shiftDate: Date,
  weekStartDate: Date,
  weekEndDate: Date
): ValidationResult {
  const date = new Date(shiftDate)
  const start = new Date(weekStartDate)
  const end = new Date(weekEndDate)

  if (date < start || date > end) {
    return {
      valid: false,
      error: "SHIFT_DATE_OUT_OF_BOUNDS",
      message: `Shift date must fall within roster week boundaries (${start.toISOString()} to ${end.toISOString()})`,
    }
  }
  return { valid: true }
}

/**
 * Validate shift time ordering
 */
export function validateShiftTimeOrder(startTime: Date, endTime: Date): ValidationResult {
  if (startTime >= endTime) {
    return {
      valid: false,
      error: "INVALID_TIME_ORDER",
      message: "startTime must be less than endTime",
    }
  }
  return { valid: true }
}

/**
 * Validate shift data integrity
 */
export async function validateShiftData(
  shift: Partial<IShift>,
  weekStartDate?: Date,
  weekEndDate?: Date
): Promise<ValidationResult> {
  // Validate time ordering if both times are provided
  if (shift.startTime && shift.endTime) {
    const timeOrderResult = validateShiftTimeOrder(shift.startTime, shift.endTime)
    if (!timeOrderResult.valid) {
      return timeOrderResult
    }
  }

  // Validate shift date boundary if week boundaries are provided
  if (shift.date && weekStartDate && weekEndDate) {
    const dateBoundaryResult = validateShiftDateBoundary(shift.date, weekStartDate, weekEndDate)
    if (!dateBoundaryResult.valid) {
      return dateBoundaryResult
    }
  }

  // Validate employee reference if provided (and not null for vacant shifts)
  if (shift.employeeId !== undefined && shift.employeeId !== null) {
    const Employee = mongoose.models.Employee
    if (Employee) {
      const employeeExists = await Employee.exists({ _id: shift.employeeId })
      if (!employeeExists) {
        return {
          valid: false,
          error: "INVALID_EMPLOYEE_REF",
          message: "employeeId does not reference an existing employee",
        }
      }
    }
  }

  // Validate location reference if provided
  if (shift.locationId) {
    const Category = mongoose.models.Category
    if (Category) {
      const locationExists = await Category.exists({
        _id: shift.locationId,
        type: "location",
      })
      if (!locationExists) {
        return {
          valid: false,
          error: "INVALID_LOCATION_REF",
          message: "locationId does not reference an existing location category",
        }
      }
    }
  }

  // Validate role reference if provided
  if (shift.roleId) {
    const Category = mongoose.models.Category
    if (Category) {
      const roleExists = await Category.exists({
        _id: shift.roleId,
        type: "role",
      })
      if (!roleExists) {
        return {
          valid: false,
          error: "INVALID_ROLE_REF",
          message: "roleId does not reference an existing role category",
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Validate complete roster data
 */
export async function validateRosterData(
  weekId: string,
  status: string,
  shifts: Partial<IShift>[],
  weekStartDate: Date,
  weekEndDate: Date
): Promise<ValidationResult> {
  // Validate week ID format
  const weekIdResult = validateWeekIdFormat(weekId)
  if (!weekIdResult.valid) {
    return weekIdResult
  }

  // Validate status
  const statusResult = validateRosterStatus(status)
  if (!statusResult.valid) {
    return statusResult
  }

  // Validate each shift
  for (const shift of shifts) {
    const shiftResult = await validateShiftData(shift, weekStartDate, weekEndDate)
    if (!shiftResult.valid) {
      return shiftResult
    }
  }

  return { valid: true }
}
