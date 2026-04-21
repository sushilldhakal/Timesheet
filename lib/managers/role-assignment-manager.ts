import mongoose from "mongoose"
import type { IEmployeeRoleAssignment } from "@/lib/db/queries/scheduling-types"
import { RoleEnablementManager } from "./role-enablement-manager"
import { EmployeeDbQueries } from "@/lib/db/queries/employees"
import { CoreEntitiesDbQueries } from "@/lib/db/queries/core-entities"
import { EmployeeRoleAssignmentsDbQueries } from "@/lib/db/queries/employee-role-assignments"

export interface AssignRoleParams {
  employeeId: mongoose.Types.ObjectId | string
  roleId: mongoose.Types.ObjectId | string
  locationId: mongoose.Types.ObjectId | string
  validFrom: Date
  validTo: Date | null
  userId: mongoose.Types.ObjectId | string
  notes?: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
  statusCode?: number
}

export class RoleAssignmentError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number = 500, code: string = "INTERNAL_ERROR") {
    super(message)
    this.name = "RoleAssignmentError"
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * Role Assignment Manager
 * Handles all business logic for employee role assignments at locations
 */
export class RoleAssignmentManager {
  private roleEnablementManager: RoleEnablementManager

  constructor() {
    this.roleEnablementManager = new RoleEnablementManager()
  }

  /**
   * Assign an employee to a role at a location
   * Creates a new assignment record with the specified date range
   * Validates that the role is enabled at the location
   * 
   * @param params - AssignRoleParams containing employeeId, roleId, locationId, dates, userId, and optional notes
   * @returns The created EmployeeRoleAssignment document
   * @throws RoleAssignmentError with appropriate status code and error message
   */
  async assignRole(params: AssignRoleParams): Promise<IEmployeeRoleAssignment> {
    try {
      const { employeeId, roleId, locationId, validFrom, validTo, userId, notes } = params

      // Validate input parameters
      if (!employeeId) {
        throw new RoleAssignmentError("Employee ID is required", 400, "MISSING_EMPLOYEE_ID")
      }
      if (!roleId) {
        throw new RoleAssignmentError("Role ID is required", 400, "MISSING_ROLE_ID")
      }
      if (!locationId) {
        throw new RoleAssignmentError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }
      if (!validFrom) {
        throw new RoleAssignmentError("Valid from date is required", 400, "MISSING_VALID_FROM")
      }
      if (!userId) {
        throw new RoleAssignmentError("User ID is required", 400, "MISSING_USER_ID")
      }

      // Validate date is valid
      if (!(validFrom instanceof Date) || isNaN(validFrom.getTime())) {
        throw new RoleAssignmentError("Valid from date must be a valid date", 400, "INVALID_VALID_FROM")
      }
      if (validTo && (!(validTo instanceof Date) || isNaN(validTo.getTime()))) {
        throw new RoleAssignmentError("Valid to date must be a valid date", 400, "INVALID_VALID_TO")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(employeeId.toString())) {
        throw new RoleAssignmentError("Invalid employee ID format", 400, "INVALID_EMPLOYEE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleAssignmentError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleAssignmentError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
        throw new RoleAssignmentError("Invalid user ID format", 400, "INVALID_USER_ID")
      }

      // Validate the assignment
      const validation = await this.validateAssignment(
        employeeId,
        roleId,
        locationId,
        validFrom,
        validTo
      )

      if (!validation.valid) {
        throw new RoleAssignmentError(
          validation.error || "Assignment validation failed",
          validation.statusCode || 400,
          "VALIDATION_FAILED"
        )
      }

      // Get tenantId from the employee
      const employee = await EmployeeDbQueries.findEmployeeById(employeeId.toString())
      if (!employee) {
        throw new RoleAssignmentError("Employee not found", 404, "EMPLOYEE_NOT_FOUND")
      }

      // Create the assignment record
      const assignment = EmployeeRoleAssignmentsDbQueries.createDoc({
        tenantId: (employee as any).tenantId,
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        validFrom,
        validTo,
        assignedBy: new mongoose.Types.ObjectId(userId.toString()),
        assignedAt: new Date(),
        notes: notes || "",
      })

      await assignment.save()
      return assignment
    } catch (error) {
      // Re-throw RoleAssignmentError as-is
      if (error instanceof RoleAssignmentError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "ValidationError") {
          throw new RoleAssignmentError(
            `Validation error: ${error.message}`,
            400,
            "DATABASE_VALIDATION_ERROR"
          )
        }
        // Handle duplicate key errors (code 11000)
        if ((error as any).code === 11000) {
          throw new RoleAssignmentError(
            "A duplicate assignment already exists. This may indicate an overlapping assignment.",
            409,
            "DUPLICATE_ASSIGNMENT"
          )
        }
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("Database error while creating assignment:", error)
          throw new RoleAssignmentError(
            "Database error while creating assignment",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message.includes("connection") || error.message.includes("timeout")) {
          console.error("Database connection error while creating assignment:", error)
          throw new RoleAssignmentError(
            "Database connection error. Please try again.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
        // Re-throw other errors with context
        console.error("Failed to assign role:", error)
        throw new RoleAssignmentError(
          `Failed to assign role: ${error.message}`,
          500,
          "ASSIGNMENT_FAILED"
        )
      }
      console.error("Unknown error while assigning role:", error)
      throw new RoleAssignmentError(
        "Failed to assign role: Unknown error occurred",
        500,
        "UNKNOWN_ERROR"
      )
    }
  }

  /**
   * End a role assignment
   * Sets the validTo date to the current date/time
   * 
   * @param assignmentId - The assignment ID to end
   * @param userId - The user performing the action (for audit trail)
   * @param notes - Optional notes about why the assignment is ending
   * @throws RoleAssignmentError with appropriate status code and error message
   */
  async endAssignment(
    assignmentId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    notes?: string
  ): Promise<void> {
    try {
      // Validate input parameters
      if (!assignmentId) {
        throw new RoleAssignmentError("Assignment ID is required", 400, "MISSING_ASSIGNMENT_ID")
      }
      if (!userId) {
        throw new RoleAssignmentError("User ID is required", 400, "MISSING_USER_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(assignmentId.toString())) {
        throw new RoleAssignmentError("Invalid assignment ID format", 400, "INVALID_ASSIGNMENT_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
        throw new RoleAssignmentError("Invalid user ID format", 400, "INVALID_USER_ID")
      }

      const now = new Date()

      // Find the assignment
      const assignment = await EmployeeRoleAssignmentsDbQueries.findById(assignmentId.toString())

      if (!assignment) {
        throw new RoleAssignmentError(
          `Assignment with ID ${assignmentId} not found`,
          404,
          "ASSIGNMENT_NOT_FOUND"
        )
      }

      // Check if already ended
      if (assignment.validTo && assignment.validTo <= now) {
        throw new RoleAssignmentError(
          "Assignment has already ended",
          400,
          "ASSIGNMENT_ALREADY_ENDED"
        )
      }

      // Set validTo to now
      assignment.validTo = now
      assignment.isActive = false
      
      // Append notes if provided
      if (notes) {
        assignment.notes = assignment.notes 
          ? `${assignment.notes}\n[Ended by user ${userId}]: ${notes}`
          : `[Ended by user ${userId}]: ${notes}`
      }

      await assignment.save()
    } catch (error) {
      // Re-throw RoleAssignmentError as-is
      if (error instanceof RoleAssignmentError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "ValidationError") {
          throw new RoleAssignmentError(
            `Validation error: ${error.message}`,
            400,
            "DATABASE_VALIDATION_ERROR"
          )
        }
        if (error.name === "CastError") {
          throw new RoleAssignmentError(
            "Invalid assignment ID format",
            400,
            "INVALID_ASSIGNMENT_ID"
          )
        }
        // Handle duplicate key errors (code 11000)
        if ((error as any).code === 11000) {
          throw new RoleAssignmentError(
            "A duplicate assignment already exists",
            409,
            "DUPLICATE_ASSIGNMENT"
          )
        }
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("Database error while ending assignment:", error)
          throw new RoleAssignmentError(
            "Database error while ending assignment",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message.includes("connection") || error.message.includes("timeout")) {
          console.error("Database connection error while ending assignment:", error)
          throw new RoleAssignmentError(
            "Database connection error. Please try again.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
        // Re-throw other errors with context
        console.error("Failed to end assignment:", error)
        throw new RoleAssignmentError(
          `Failed to end assignment: ${error.message}`,
          500,
          "END_ASSIGNMENT_FAILED"
        )
      }
      console.error("Unknown error while ending assignment:", error)
      throw new RoleAssignmentError(
        "Failed to end assignment: Unknown error occurred",
        500,
        "UNKNOWN_ERROR"
      )
    }
  }

  /**
   * Get all role assignments for an employee
   * Optionally filtered by location and date
   * 
   * @param employeeId - The employee ID
   * @param locationId - Optional location ID to filter by
   * @param date - The date to check (defaults to current date)
   * @param includeInactive - Whether to include expired assignments
   * @returns Array of EmployeeRoleAssignment documents with populated details
   * @throws RoleAssignmentError with appropriate status code and error message
   */
  async getEmployeeAssignments(
    employeeId: mongoose.Types.ObjectId | string,
    locationId?: mongoose.Types.ObjectId | string,
    date: Date = new Date(),
    includeInactive: boolean = false
  ): Promise<IEmployeeRoleAssignment[]> {
    try {
      // Validate input parameters
      if (!employeeId) {
        throw new RoleAssignmentError("Employee ID is required", 400, "MISSING_EMPLOYEE_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(employeeId.toString())) {
        throw new RoleAssignmentError("Invalid employee ID format", 400, "INVALID_EMPLOYEE_ID")
      }

      if (locationId && !mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleAssignmentError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }

      // Validate date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new RoleAssignmentError("Date must be a valid date", 400, "INVALID_DATE")
      }

      const query: any = {
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
      }

      // Filter by location if provided
      if (locationId) {
        query.locationId = new mongoose.Types.ObjectId(locationId.toString())
      }

      // Filter by date if not including inactive
      if (!includeInactive) {
        query.validFrom = { $lte: date }
        query.$or = [
          { validTo: null },
          { validTo: { $gte: date } },
        ]
      }

      const assignments = await EmployeeRoleAssignmentsDbQueries.find(query)
        .populate("roleId", "name color type")
        .populate("locationId", "name color type lat lng")
        .populate("assignedBy", "name email")
        .sort({ validFrom: -1 })

      return assignments
    } catch (error) {
      // Re-throw RoleAssignmentError as-is
      if (error instanceof RoleAssignmentError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "CastError") {
          throw new RoleAssignmentError(
            "Invalid ID format in query",
            400,
            "INVALID_ID_FORMAT"
          )
        }
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("Database error while fetching assignments:", error)
          throw new RoleAssignmentError(
            "Database error while fetching assignments",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message.includes("connection") || error.message.includes("timeout")) {
          console.error("Database connection error while fetching assignments:", error)
          throw new RoleAssignmentError(
            "Database connection error. Please try again.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
        // Re-throw other errors with context
        console.error("Failed to get employee assignments:", error)
        throw new RoleAssignmentError(
          `Failed to get employee assignments: ${error.message}`,
          500,
          "FETCH_ASSIGNMENTS_FAILED"
        )
      }
      console.error("Unknown error while fetching employee assignments:", error)
      throw new RoleAssignmentError(
        "Failed to get employee assignments: Unknown error occurred",
        500,
        "UNKNOWN_ERROR"
      )
    }
  }

  /**
   * Get all employees assigned to a role at a location
   * 
   * @param roleId - The role ID
   * @param locationId - The location ID
   * @param date - The date to check (defaults to current date)
   * @returns Array of EmployeeRoleAssignment documents with populated employee details
   * @throws RoleAssignmentError with appropriate status code and error message
   */
  async getEmployeesForRole(
    roleId: mongoose.Types.ObjectId | string,
    locationId: mongoose.Types.ObjectId | string,
    date: Date = new Date()
  ): Promise<IEmployeeRoleAssignment[]> {
    try {
      // Validate input parameters
      if (!roleId) {
        throw new RoleAssignmentError("Role ID is required", 400, "MISSING_ROLE_ID")
      }
      if (!locationId) {
        throw new RoleAssignmentError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleAssignmentError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleAssignmentError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }

      // Validate date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new RoleAssignmentError("Date must be a valid date", 400, "INVALID_DATE")
      }

      const assignments = await EmployeeRoleAssignmentsDbQueries.find({
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        validFrom: { $lte: date },
        $or: [
          { validTo: null },
          { validTo: { $gte: date } },
        ],
      })
        .populate("employeeId", "name email phone")
        .populate("assignedBy", "name email")
        .sort({ validFrom: -1 })

      return assignments
    } catch (error) {
      // Re-throw RoleAssignmentError as-is
      if (error instanceof RoleAssignmentError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "CastError") {
          throw new RoleAssignmentError(
            "Invalid ID format in query",
            400,
            "INVALID_ID_FORMAT"
          )
        }
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("Database error while fetching employees for role:", error)
          throw new RoleAssignmentError(
            "Database error while fetching employees",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message.includes("connection") || error.message.includes("timeout")) {
          console.error("Database connection error while fetching employees:", error)
          throw new RoleAssignmentError(
            "Database connection error. Please try again.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
        // Re-throw other errors with context
        console.error("Failed to get employees for role:", error)
        throw new RoleAssignmentError(
          `Failed to get employees for role: ${error.message}`,
          500,
          "FETCH_EMPLOYEES_FAILED"
        )
      }
      console.error("Unknown error while fetching employees for role:", error)
      throw new RoleAssignmentError(
        "Failed to get employees for role: Unknown error occurred",
        500,
        "UNKNOWN_ERROR"
      )
    }
  }

  /**
   * Check if an employee is assigned to a role at a location on a specific date
   * 
   * @param employeeId - The employee ID
   * @param roleId - The role ID
   * @param locationId - The location ID
   * @param date - The date to check (defaults to current date)
   * @returns true if the employee is assigned, false otherwise
   * @throws RoleAssignmentError with appropriate status code and error message
   */
  async isEmployeeAssigned(
    employeeId: mongoose.Types.ObjectId | string,
    roleId: mongoose.Types.ObjectId | string,
    locationId: mongoose.Types.ObjectId | string,
    date: Date = new Date()
  ): Promise<boolean> {
    try {
      // Validate input parameters
      if (!employeeId) {
        throw new RoleAssignmentError("Employee ID is required", 400, "MISSING_EMPLOYEE_ID")
      }
      if (!roleId) {
        throw new RoleAssignmentError("Role ID is required", 400, "MISSING_ROLE_ID")
      }
      if (!locationId) {
        throw new RoleAssignmentError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(employeeId.toString())) {
        throw new RoleAssignmentError("Invalid employee ID format", 400, "INVALID_EMPLOYEE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleAssignmentError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleAssignmentError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }

      // Validate date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new RoleAssignmentError("Date must be a valid date", 400, "INVALID_DATE")
      }

      const assignment = await EmployeeRoleAssignmentsDbQueries.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        validFrom: { $lte: date },
        $or: [
          { validTo: null },
          { validTo: { $gte: date } },
        ],
      })

      return !!assignment
    } catch (error) {
      // Re-throw RoleAssignmentError as-is
      if (error instanceof RoleAssignmentError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "CastError") {
          throw new RoleAssignmentError(
            "Invalid ID format in query",
            400,
            "INVALID_ID_FORMAT"
          )
        }
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("Database error while checking employee assignment:", error)
          throw new RoleAssignmentError(
            "Database error while checking assignment",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message.includes("connection") || error.message.includes("timeout")) {
          console.error("Database connection error while checking assignment:", error)
          throw new RoleAssignmentError(
            "Database connection error. Please try again.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
        // Re-throw other errors with context
        console.error("Failed to check employee assignment:", error)
        throw new RoleAssignmentError(
          `Failed to check employee assignment: ${error.message}`,
          500,
          "CHECK_ASSIGNMENT_FAILED"
        )
      }
      console.error("Unknown error while checking employee assignment:", error)
      throw new RoleAssignmentError(
        "Failed to check employee assignment: Unknown error occurred",
        500,
        "UNKNOWN_ERROR"
      )
    }
  }

  /**
   * Validate an assignment before creating it
   * Checks:
   * - Employee exists
   * - Role exists and is of type 'role'
   * - Location exists and is of type 'location'
   * - Date range is valid (validFrom <= validTo)
   * - Role is enabled at the location during the assignment period
   * - No overlapping assignments exist
   * 
   * @param employeeId - The employee ID
   * @param roleId - The role ID
   * @param locationId - The location ID
   * @param validFrom - Assignment start date
   * @param validTo - Assignment end date (null = indefinite)
   * @returns ValidationResult with valid flag, optional error message, and status code
   */
  async validateAssignment(
    employeeId: mongoose.Types.ObjectId | string,
    roleId: mongoose.Types.ObjectId | string,
    locationId: mongoose.Types.ObjectId | string,
    validFrom: Date,
    validTo: Date | null
  ): Promise<ValidationResult> {
    try {
      // Validate date range
      if (validTo && validFrom > validTo) {
        return {
          valid: false,
          error: "validFrom must be before or equal to validTo",
          statusCode: 400,
        }
      }

      // Verify employee exists
      const employee = await EmployeeDbQueries.findEmployeeById(employeeId.toString())
      if (!employee) {
        return {
          valid: false,
          error: `Employee with ID ${employeeId} not found`,
          statusCode: 404,
        }
      }

      // Verify role exists
      const role = await CoreEntitiesDbQueries.teamFindById(roleId.toString())
      if (!role) {
        return {
          valid: false,
          error: `Role with ID ${roleId} not found`,
          statusCode: 404,
        }
      }

      // Verify location exists
      const location = await CoreEntitiesDbQueries.locationFindById(locationId.toString())
      if (!location) {
        return {
          valid: false,
          error: `Location with ID ${locationId} not found`,
          statusCode: 404,
        }
      }

      // Check if role is enabled at location during the assignment period
      // We need to check if the role is enabled for the entire assignment period
      const roleEnabledAtStart = await this.roleEnablementManager.isRoleEnabled(
        locationId,
        roleId,
        validFrom
      )

      if (!roleEnabledAtStart) {
        return {
          valid: false,
          error: `Role "${role.name}" is not enabled at location "${location.name}" on the assignment start date`,
          statusCode: 400,
        }
      }

      // If there's an end date, also check that the role is enabled at the end
      if (validTo) {
        const roleEnabledAtEnd = await this.roleEnablementManager.isRoleEnabled(
          locationId,
          roleId,
          validTo
        )

        if (!roleEnabledAtEnd) {
          return {
            valid: false,
            error: `Role "${role.name}" is not enabled at location "${location.name}" on the assignment end date`,
            statusCode: 400,
          }
        }
      }

      // Check for overlapping assignments
      // This will be handled by the pre-save hook in the schema,
      // but we can do an early check here for better error messages
      const overlappingQuery: any = {
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
      }

      // Check for date range overlap
      if (validTo) {
        overlappingQuery.$or = [
          {
            validTo: null,
            validFrom: { $lt: validTo },
          },
          {
            validFrom: { $lt: validTo },
            validTo: { $gt: validFrom },
          },
        ]
      } else {
        overlappingQuery.$or = [
          {
            validTo: null,
          },
          {
            validTo: { $gt: validFrom },
          },
        ]
      }

      const overlapping = await EmployeeRoleAssignmentsDbQueries.findOne(overlappingQuery)
      if (overlapping) {
        return {
          valid: false,
          error: `Employee already has an overlapping assignment for this role at this location. ` +
            `Existing assignment: ${overlapping.validFrom.toISOString()} to ${
              overlapping.validTo ? overlapping.validTo.toISOString() : "indefinite"
            }`,
          statusCode: 409,
        }
      }

      return { valid: true }
    } catch (error) {
      // Handle database errors during validation
      if (error instanceof Error) {
        if (error.name === "CastError") {
          return {
            valid: false,
            error: "Invalid ID format in validation",
            statusCode: 400,
          }
        }
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("Database error during assignment validation:", error)
          return {
            valid: false,
            error: "Database error during validation",
            statusCode: 500,
          }
        }
        // Handle connection errors
        if (error.message.includes("connection") || error.message.includes("timeout")) {
          console.error("Database connection error during validation:", error)
          return {
            valid: false,
            error: "Database connection error. Please try again.",
            statusCode: 503,
          }
        }
        // Log unexpected errors
        console.error("Unexpected error during assignment validation:", error)
        return {
          valid: false,
          error: `Validation failed: ${error.message}`,
          statusCode: 500,
        }
      }
      return {
        valid: false,
        error: "Unknown error during validation",
        statusCode: 500,
      }
    }
  }
}
