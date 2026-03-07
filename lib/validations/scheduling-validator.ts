import mongoose from "mongoose"
import { IShift } from "../db/schemas/roster"
import { RoleEnablementManager } from "../managers/role-enablement-manager"
import { RoleAssignmentManager } from "../managers/role-assignment-manager"
import { Category } from "../db/schemas/category"
import { Employee } from "../db/schemas/employee"

export interface ShiftValidationResult {
  valid: boolean
  error?: string
  message?: string
}

export interface RosterValidationResult {
  valid: boolean
  warnings: string[]
}

/**
 * Scheduling Validator
 * Validates shifts and roster generation based on role enablement and employee assignments
 */
export class SchedulingValidator {
  private roleEnablementManager: RoleEnablementManager
  private roleAssignmentManager: RoleAssignmentManager

  constructor() {
    this.roleEnablementManager = new RoleEnablementManager()
    this.roleAssignmentManager = new RoleAssignmentManager()
  }

  /**
   * Validate that a shift can be created
   * Checks:
   * - Role is enabled at the location on the shift date
   * - Employee is assigned to the role at the location on the shift date
   * - Employee, role, and location exist
   * 
   * @param employeeId - The employee ID (can be null for vacant shifts)
   * @param roleId - The role ID
   * @param locationId - The location ID
   * @param shiftDate - The date of the shift
   * @returns ShiftValidationResult with valid flag and optional error/message
   */
  async validateShift(
    employeeId: mongoose.Types.ObjectId | string | null,
    roleId: mongoose.Types.ObjectId | string,
    locationId: mongoose.Types.ObjectId | string,
    shiftDate: Date
  ): Promise<ShiftValidationResult> {
    // Verify role exists and is of type 'role'
    const role = await Category.findOne({
      _id: new mongoose.Types.ObjectId(roleId.toString()),
      type: "role",
    })
    if (!role) {
      return {
        valid: false,
        error: `Role with ID ${roleId} not found`,
        message: "The selected role does not exist. Please select a valid role.",
      }
    }

    // Verify location exists and is of type 'location'
    const location = await Category.findOne({
      _id: new mongoose.Types.ObjectId(locationId.toString()),
      type: "location",
    })
    if (!location) {
      return {
        valid: false,
        error: `Location with ID ${locationId} not found`,
        message: "The selected location does not exist. Please select a valid location.",
      }
    }

    // Check if role is enabled at location on shift date
    const roleEnabled = await this.roleEnablementManager.isRoleEnabled(
      locationId,
      roleId,
      shiftDate
    )

    if (!roleEnabled) {
      return {
        valid: false,
        error: `Role "${role.name}" is not enabled at location "${location.name}" on ${shiftDate.toISOString()}`,
        message: `The role "${role.name}" is not available at "${location.name}" on this date. Please enable the role at this location first, or select a different role or location.`,
      }
    }

    // If this is a vacant shift (no employee), validation passes
    if (!employeeId) {
      return {
        valid: true,
        message: "Vacant shift is valid (role is enabled at location)",
      }
    }

    // Verify employee exists
    const employee = await Employee.findById(
      new mongoose.Types.ObjectId(employeeId.toString())
    )
    if (!employee) {
      return {
        valid: false,
        error: `Employee with ID ${employeeId} not found`,
        message: "The selected employee does not exist. Please select a valid employee.",
      }
    }

    // Check if employee is assigned to role at location on shift date
    const employeeAssigned = await this.roleAssignmentManager.isEmployeeAssigned(
      employeeId,
      roleId,
      locationId,
      shiftDate
    )

    if (!employeeAssigned) {
      return {
        valid: false,
        error: `Employee "${employee.name}" is not assigned to role "${role.name}" at location "${location.name}" on ${shiftDate.toISOString()}`,
        message: `${employee.name} is not assigned to the "${role.name}" role at "${location.name}" on this date. Please assign the employee to this role at this location first, or select a different employee.`,
      }
    }

    return {
      valid: true,
      message: `Shift is valid: ${employee.name} can work as ${role.name} at ${location.name}`,
    }
  }

  /**
   * Get validation errors for a shift
   * Returns an array of error messages for the shift
   * 
   * @param shift - The shift to validate
   * @returns Array of error messages (empty if valid)
   */
  async getShiftValidationErrors(shift: IShift): Promise<string[]> {
    const errors: string[] = []

    // Validate shift has required fields
    if (!shift.roleId) {
      errors.push("Shift is missing role")
      return errors
    }

    if (!shift.locationId) {
      errors.push("Shift is missing location")
      return errors
    }

    if (!shift.date) {
      errors.push("Shift is missing date")
      return errors
    }

    // Validate the shift using validateShift
    const result = await this.validateShift(
      shift.employeeId,
      shift.roleId,
      shift.locationId,
      shift.date
    )

    if (!result.valid && result.message) {
      errors.push(result.message)
    }

    // Additional validation: check shift times
    if (shift.startTime && shift.endTime && shift.startTime >= shift.endTime) {
      errors.push("Shift start time must be before end time")
    }

    return errors
  }

  /**
   * Validate roster generation parameters
   * Checks for potential issues before generating a roster
   * Returns warnings for locations with no enabled roles or roles with no assigned employees
   * 
   * @param weekId - The week identifier (e.g., "2024-W15")
   * @param locationId - Optional location ID to filter by
   * @returns RosterValidationResult with valid flag and array of warnings
   */
  async validateRosterGeneration(
    weekId: string,
    locationId?: mongoose.Types.ObjectId | string
  ): Promise<RosterValidationResult> {
    const warnings: string[] = []

    // Validate weekId format
    if (!/^\d{4}-W\d{2}$/.test(weekId)) {
      return {
        valid: false,
        warnings: ["Invalid week ID format. Expected format: YYYY-Www (e.g., 2024-W15)"],
      }
    }

    // If locationId is provided, validate it
    if (locationId) {
      const location = await Category.findOne({
        _id: new mongoose.Types.ObjectId(locationId.toString()),
        type: "location",
      })

      if (!location) {
        return {
          valid: false,
          warnings: [`Location with ID ${locationId} not found`],
        }
      }

      // Check if location has any enabled roles
      const enabledRoles = await this.roleEnablementManager.getEnabledRoles(locationId)
      if (enabledRoles.length === 0) {
        warnings.push(
          `Location "${location.name}" has no enabled roles. No shifts can be generated for this location.`
        )
      } else {
        // Check each enabled role for assigned employees
        for (const enablement of enabledRoles) {
          const employees = await this.roleAssignmentManager.getEmployeesForRole(
            enablement.roleId,
            locationId
          )
          if (employees.length === 0) {
            const role = await Category.findById(enablement.roleId)
            warnings.push(
              `Role "${role?.name}" at "${location.name}" has no assigned employees. Shifts for this role will be vacant.`
            )
          }
        }
      }
    } else {
      // Check all locations
      const locations = await Category.find({ type: "location" })

      for (const location of locations) {
        const enabledRoles = await this.roleEnablementManager.getEnabledRoles(location._id)
        if (enabledRoles.length === 0) {
          warnings.push(
            `Location "${location.name}" has no enabled roles. No shifts can be generated for this location.`
          )
        } else {
          // Check each enabled role for assigned employees
          for (const enablement of enabledRoles) {
            const employees = await this.roleAssignmentManager.getEmployeesForRole(
              enablement.roleId,
              location._id
            )
            if (employees.length === 0) {
              const role = await Category.findById(enablement.roleId)
              warnings.push(
                `Role "${role?.name}" at "${location.name}" has no assigned employees. Shifts for this role will be vacant.`
              )
            }
          }
        }
      }
    }

    return {
      valid: true,
      warnings,
    }
  }
}