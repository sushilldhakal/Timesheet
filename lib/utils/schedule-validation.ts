import mongoose from "mongoose"
import { ISchedule } from "../db/schemas/schedule"
import { Category } from "../db/schemas/category"

/**
 * Validation error types for schedules
 */
export enum ScheduleValidationError {
  INVALID_DAY_OF_WEEK = "INVALID_DAY_OF_WEEK",
  INVALID_TIME_FORMAT = "INVALID_TIME_FORMAT",
  INVALID_TIME_ORDER = "INVALID_TIME_ORDER",
  INVALID_DATE_ORDER = "INVALID_DATE_ORDER",
  MISSING_EFFECTIVE_FROM = "MISSING_EFFECTIVE_FROM",
  INVALID_LOCATION_REF = "INVALID_LOCATION_REF",
  INVALID_ROLE_REF = "INVALID_ROLE_REF",
}

/**
 * Validation result type
 */
export type ValidationResult =
  | { success: true }
  | { success: false; error: ScheduleValidationError; message: string }

/**
 * Validates that dayOfWeek array contains only integers from 0 to 6
 */
export function validateDayOfWeek(dayOfWeek: number[]): ValidationResult {
  if (!Array.isArray(dayOfWeek) || dayOfWeek.length === 0) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_DAY_OF_WEEK,
      message: "dayOfWeek must be a non-empty array",
    }
  }

  for (const day of dayOfWeek) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return {
        success: false,
        error: ScheduleValidationError.INVALID_DAY_OF_WEEK,
        message: "dayOfWeek must contain only integers from 0 to 6",
      }
    }
  }

  return { success: true }
}

/**
 * Validates that startTime is less than endTime
 */
export function validateTimeOrder(startTime: Date, endTime: Date): ValidationResult {
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_FORMAT,
      message: "startTime and endTime must be Date objects",
    }
  }

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_FORMAT,
      message: "startTime and endTime must be valid Date objects",
    }
  }

  if (startTime >= endTime) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_ORDER,
      message: "startTime must be less than endTime",
    }
  }

  return { success: true }
}

/**
 * Validates that effectiveFrom is less than or equal to effectiveTo
 */
export function validateDateOrder(
  effectiveFrom: Date,
  effectiveTo: Date | null
): ValidationResult {
  if (!(effectiveFrom instanceof Date)) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_FORMAT,
      message: "effectiveFrom must be a Date object",
    }
  }

  if (isNaN(effectiveFrom.getTime())) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_FORMAT,
      message: "effectiveFrom must be a valid Date object",
    }
  }

  if (effectiveTo === null) {
    return { success: true }
  }

  if (!(effectiveTo instanceof Date)) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_FORMAT,
      message: "effectiveTo must be a Date object or null",
    }
  }

  if (isNaN(effectiveTo.getTime())) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_TIME_FORMAT,
      message: "effectiveTo must be a valid Date object",
    }
  }

  if (effectiveFrom > effectiveTo) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_DATE_ORDER,
      message: "effectiveFrom must be less than or equal to effectiveTo",
    }
  }

  return { success: true }
}

/**
 * Validates that locationId references an existing location category
 */
export async function validateLocationReference(
  locationId: mongoose.Types.ObjectId
): Promise<ValidationResult> {
  try {
    const location = await Category.findOne({
      _id: locationId,
      type: "location",
    })

    if (!location) {
      return {
        success: false,
        error: ScheduleValidationError.INVALID_LOCATION_REF,
        message: "locationId does not reference an existing location category",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_LOCATION_REF,
      message: "Failed to validate locationId reference",
    }
  }
}

/**
 * Validates that roleId references an existing role category
 */
export async function validateRoleReference(
  roleId: mongoose.Types.ObjectId
): Promise<ValidationResult> {
  try {
    const role = await Category.findOne({
      _id: roleId,
      type: "role",
    })

    if (!role) {
      return {
        success: false,
        error: ScheduleValidationError.INVALID_ROLE_REF,
        message: "roleId does not reference an existing role category",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: ScheduleValidationError.INVALID_ROLE_REF,
      message: "Failed to validate roleId reference",
    }
  }
}

/**
 * Validates a complete schedule object
 */
export async function validateSchedule(
  schedule: Partial<ISchedule>
): Promise<ValidationResult> {
  // Validate effectiveFrom is present
  if (!schedule.effectiveFrom) {
    return {
      success: false,
      error: ScheduleValidationError.MISSING_EFFECTIVE_FROM,
      message: "effectiveFrom is required",
    }
  }

  // Validate dayOfWeek
  if (schedule.dayOfWeek) {
    const dayResult = validateDayOfWeek(schedule.dayOfWeek)
    if (!dayResult.success) return dayResult
  }

  // Validate time order
  if (schedule.startTime && schedule.endTime) {
    const timeResult = validateTimeOrder(schedule.startTime, schedule.endTime)
    if (!timeResult.success) return timeResult
  }

  // Validate date order
  if (schedule.effectiveFrom) {
    const dateResult = validateDateOrder(
      schedule.effectiveFrom,
      schedule.effectiveTo ?? null
    )
    if (!dateResult.success) return dateResult
  }

  // Validate location reference
  if (schedule.locationId) {
    const locationResult = await validateLocationReference(schedule.locationId)
    if (!locationResult.success) return locationResult
  }

  // Validate role reference
  if (schedule.roleId) {
    const roleResult = await validateRoleReference(schedule.roleId)
    if (!roleResult.success) return roleResult
  }

  return { success: true }
}
