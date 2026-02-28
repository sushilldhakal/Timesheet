/**
 * SchedulingValidator Usage Examples
 * 
 * This file demonstrates how to use the SchedulingValidator class
 * to validate shifts and roster generation.
 */

import mongoose from "mongoose"
import { SchedulingValidator } from "./scheduling-validator"
import { IShift } from "../db/schemas/roster"

// Initialize the validator
const validator = new SchedulingValidator()

/**
 * Example 1: Validate a shift before creation
 */
async function validateShiftExample() {
  const employeeId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011")
  const roleId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012")
  const locationId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013")
  const shiftDate = new Date("2024-03-15")

  const result = await validator.validateShift(
    employeeId,
    roleId,
    locationId,
    shiftDate
  )

  if (result.valid) {
    console.log("✓ Shift is valid:", result.message)
    // Proceed with shift creation
  } else {
    console.error("✗ Shift validation failed:", result.message)
    // Show error to user
  }
}

/**
 * Example 2: Validate a vacant shift (no employee assigned)
 */
async function validateVacantShiftExample() {
  const roleId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012")
  const locationId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013")
  const shiftDate = new Date("2024-03-15")

  // Pass null for employeeId to validate a vacant shift
  const result = await validator.validateShift(
    null,
    roleId,
    locationId,
    shiftDate
  )

  if (result.valid) {
    console.log("✓ Vacant shift is valid:", result.message)
    // Proceed with vacant shift creation
  } else {
    console.error("✗ Vacant shift validation failed:", result.message)
  }
}

/**
 * Example 3: Get validation errors for an existing shift
 */
async function getShiftErrorsExample() {
  const shift: IShift = {
    _id: new mongoose.Types.ObjectId(),
    employeeId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
    roleId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
    locationId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
    date: new Date("2024-03-15"),
    startTime: new Date("2024-03-15T09:00:00Z"),
    endTime: new Date("2024-03-15T17:00:00Z"),
    sourceScheduleId: null,
    estimatedCost: 0,
    notes: "",
  }

  const errors = await validator.getShiftValidationErrors(shift)

  if (errors.length === 0) {
    console.log("✓ Shift has no validation errors")
  } else {
    console.error("✗ Shift validation errors:")
    errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`)
    })
  }
}

/**
 * Example 4: Validate roster generation for a specific location
 */
async function validateRosterGenerationExample() {
  const weekId = "2024-W15"
  const locationId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013")

  const result = await validator.validateRosterGeneration(weekId, locationId)

  if (result.valid) {
    if (result.warnings.length === 0) {
      console.log("✓ Roster generation is ready with no warnings")
    } else {
      console.log("⚠ Roster generation is valid but has warnings:")
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`)
      })
    }
    // Proceed with roster generation
  } else {
    console.error("✗ Roster generation validation failed:")
    result.warnings.forEach((warning, index) => {
      console.error(`  ${index + 1}. ${warning}`)
    })
  }
}

/**
 * Example 5: Validate roster generation for all locations
 */
async function validateAllLocationsRosterExample() {
  const weekId = "2024-W15"

  // Don't pass locationId to validate all locations
  const result = await validator.validateRosterGeneration(weekId)

  if (result.valid) {
    if (result.warnings.length === 0) {
      console.log("✓ All locations are ready for roster generation")
    } else {
      console.log("⚠ Roster generation warnings:")
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`)
      })
    }
  } else {
    console.error("✗ Roster generation validation failed")
  }
}

/**
 * Example 6: Using validator in an API endpoint
 */
async function apiEndpointExample(
  employeeId: string,
  roleId: string,
  locationId: string,
  shiftDate: string
) {
  try {
    const result = await validator.validateShift(
      new mongoose.Types.ObjectId(employeeId),
      new mongoose.Types.ObjectId(roleId),
      new mongoose.Types.ObjectId(locationId),
      new Date(shiftDate)
    )

    if (!result.valid) {
      // Return 400 Bad Request with user-friendly message
      return {
        status: 400,
        body: {
          error: "Shift validation failed",
          message: result.message,
          details: result.error,
        },
      }
    }

    // Validation passed, proceed with shift creation
    return {
      status: 200,
      body: {
        message: "Shift created successfully",
      },
    }
  } catch (error) {
    // Handle unexpected errors
    return {
      status: 500,
      body: {
        error: "Internal server error",
        message: "An unexpected error occurred during validation",
      },
    }
  }
}

/**
 * Example 7: Batch validation for multiple shifts
 */
async function batchValidationExample(shifts: IShift[]) {
  const validationResults = await Promise.all(
    shifts.map(async (shift) => {
      const errors = await validator.getShiftValidationErrors(shift)
      return {
        shift,
        errors,
        isValid: errors.length === 0,
      }
    })
  )

  const validShifts = validationResults.filter((r) => r.isValid)
  const invalidShifts = validationResults.filter((r) => !r.isValid)

  console.log(`✓ Valid shifts: ${validShifts.length}`)
  console.log(`✗ Invalid shifts: ${invalidShifts.length}`)

  if (invalidShifts.length > 0) {
    console.log("\nInvalid shifts:")
    invalidShifts.forEach((result, index) => {
      console.log(`\nShift ${index + 1}:`)
      result.errors.forEach((error) => {
        console.log(`  - ${error}`)
      })
    })
  }

  return {
    validShifts: validShifts.map((r) => r.shift),
    invalidShifts: invalidShifts.map((r) => ({
      shift: r.shift,
      errors: r.errors,
    })),
  }
}

// Export examples for reference
export {
  validateShiftExample,
  validateVacantShiftExample,
  getShiftErrorsExample,
  validateRosterGenerationExample,
  validateAllLocationsRosterExample,
  apiEndpointExample,
  batchValidationExample,
}
