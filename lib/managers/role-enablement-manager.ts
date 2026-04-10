import mongoose from "mongoose"
import { LocationRoleEnablement, ILocationRoleEnablement } from "../db/schemas/location-role-enablement"
import { Location } from "../db/schemas/location"
import { Role } from "../db/schemas/role"

export interface EnableRoleParams {
  locationId: mongoose.Types.ObjectId | string
  roleId: mongoose.Types.ObjectId | string
  effectiveFrom: Date
  effectiveTo: Date | null
  userId: mongoose.Types.ObjectId | string
}

export interface BulkEnableRoleParams {
  roleId: mongoose.Types.ObjectId | string
  locationIds: (mongoose.Types.ObjectId | string)[]
  effectiveFrom: Date
  effectiveTo: Date | null
  userId: mongoose.Types.ObjectId | string
}

export class RoleEnablementError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number = 500, code: string = "INTERNAL_ERROR") {
    super(message)
    this.name = "RoleEnablementError"
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * Role Enablement Manager
 * Handles all business logic for role enablement at locations
 */
export class RoleEnablementManager {
  /**
   * Enable a role at a location
   * Creates a new enablement record with the specified date range
   * 
   * @param params - EnableRoleParams containing locationId, roleId, dates, and userId
   * @returns The created LocationRoleEnablement document
   * @throws RoleEnablementError with appropriate status code and error message
   */
  async enableRole(params: EnableRoleParams): Promise<ILocationRoleEnablement> {
    try {
      const { locationId, roleId, effectiveFrom, effectiveTo, userId } = params

      // Validate input parameters
      if (!locationId) {
        throw new RoleEnablementError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }
      if (!roleId) {
        throw new RoleEnablementError("Role ID is required", 400, "MISSING_ROLE_ID")
      }
      if (!effectiveFrom) {
        throw new RoleEnablementError("Effective from date is required", 400, "MISSING_EFFECTIVE_FROM")
      }
      if (!userId) {
        throw new RoleEnablementError("User ID is required", 400, "MISSING_USER_ID")
      }

      // Validate date is valid
      if (!(effectiveFrom instanceof Date) || isNaN(effectiveFrom.getTime())) {
        throw new RoleEnablementError("Effective from date must be a valid date", 400, "INVALID_EFFECTIVE_FROM")
      }
      if (effectiveTo && (!(effectiveTo instanceof Date) || isNaN(effectiveTo.getTime()))) {
        throw new RoleEnablementError("Effective to date must be a valid date", 400, "INVALID_EFFECTIVE_TO")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleEnablementError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleEnablementError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
        throw new RoleEnablementError("Invalid user ID format", 400, "INVALID_USER_ID")
      }

      // Validate date range
      if (effectiveTo && effectiveFrom > effectiveTo) {
        throw new RoleEnablementError(
          "effectiveFrom must be before or equal to effectiveTo",
          400,
          "INVALID_DATE_RANGE"
        )
      }

      // Verify location exists
      const location = await Location.findById(new mongoose.Types.ObjectId(locationId.toString()))
      if (!location) {
        throw new RoleEnablementError(
          `Location with ID ${locationId} not found`,
          404,
          "LOCATION_NOT_FOUND"
        )
      }

      // Verify role exists
      const role = await Role.findById(new mongoose.Types.ObjectId(roleId.toString()))
      if (!role) {
        throw new RoleEnablementError(
          `Role with ID ${roleId} not found`,
          404,
          "ROLE_NOT_FOUND"
        )
      }

      // Check for overlapping enablements
      const overlappingQuery: any = {
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
      }

      // Check for date range overlap
      if (effectiveTo) {
        overlappingQuery.$or = [
          {
            effectiveTo: null,
            effectiveFrom: { $lt: effectiveTo },
          },
          {
            effectiveFrom: { $lt: effectiveTo },
            effectiveTo: { $gt: effectiveFrom },
          },
        ]
      } else {
        overlappingQuery.$or = [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: { $gt: effectiveFrom },
          },
        ]
      }

      const overlapping = await LocationRoleEnablement.findOne(overlappingQuery)
      if (overlapping) {
        throw new RoleEnablementError(
          `Role is already enabled at this location during the specified period. ` +
          `Existing enablement: ${overlapping.effectiveFrom.toISOString()} to ${
            overlapping.effectiveTo ? overlapping.effectiveTo.toISOString() : "indefinite"
          }`,
          409,
          "OVERLAPPING_ENABLEMENT"
        )
      }

      // Create the enablement record
      const enablement = new LocationRoleEnablement({
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        effectiveFrom,
        effectiveTo,
        createdBy: new mongoose.Types.ObjectId(userId.toString()),
      })

      await enablement.save()
      return enablement
    } catch (error) {
      // Re-throw RoleEnablementError as-is
      if (error instanceof RoleEnablementError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "ValidationError") {
          console.error("[RoleEnablementManager.enableRole] Validation error:", error)
          throw new RoleEnablementError(
            `Validation error: ${error.message}`,
            400,
            "DATABASE_VALIDATION_ERROR"
          )
        }
        // Handle duplicate key errors (code 11000)
        if ((error as any).code === 11000) {
          console.error("[RoleEnablementManager.enableRole] Duplicate key error:", error)
          throw new RoleEnablementError(
            "A duplicate enablement already exists. This may indicate an overlapping enablement.",
            409,
            "DUPLICATE_ENABLEMENT"
          )
        }
        // Handle MongoDB errors
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("[RoleEnablementManager.enableRole] Database error:", error)
          throw new RoleEnablementError(
            "Database error occurred while enabling role",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message?.includes("connection") || error.message?.includes("timeout")) {
          console.error("[RoleEnablementManager.enableRole] Connection error:", error)
          throw new RoleEnablementError(
            "Database connection error. Please try again later.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
      }

      // Unknown error
      console.error("[RoleEnablementManager.enableRole] Unknown error:", error)
      throw new RoleEnablementError(
        "Failed to enable role at location",
        500,
        "ENABLE_FAILED"
      )
    }
  }

  /**
   * Disable a role at a location
   * Sets the effectiveTo date to the current date/time
   * 
   * @param locationId - The location ID
   * @param roleId - The role ID
   * @param userId - The user performing the action
   * @throws RoleEnablementError with appropriate status code and error message
   */
  async disableRole(
    locationId: mongoose.Types.ObjectId | string,
    roleId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string
  ): Promise<void> {
    try {
      // Validate input parameters
      if (!locationId) {
        throw new RoleEnablementError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }
      if (!roleId) {
        throw new RoleEnablementError("Role ID is required", 400, "MISSING_ROLE_ID")
      }
      if (!userId) {
        throw new RoleEnablementError("User ID is required", 400, "MISSING_USER_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleEnablementError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleEnablementError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
        throw new RoleEnablementError("Invalid user ID format", 400, "INVALID_USER_ID")
      }

      const now = new Date()

      // Find the active enablement (no effectiveTo or effectiveTo in the future)
      const enablement = await LocationRoleEnablement.findOne({
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        effectiveFrom: { $lte: now },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gt: now } },
        ],
      })

      if (!enablement) {
        throw new RoleEnablementError(
          "No active role enablement found to disable",
          404,
          "NO_ACTIVE_ENABLEMENT"
        )
      }

      // Set effectiveTo to now
      enablement.effectiveTo = now
      enablement.isActive = false
      await enablement.save()
    } catch (error) {
      // Re-throw RoleEnablementError as-is
      if (error instanceof RoleEnablementError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "ValidationError") {
          console.error("[RoleEnablementManager.disableRole] Validation error:", error)
          throw new RoleEnablementError(
            `Validation error: ${error.message}`,
            400,
            "DATABASE_VALIDATION_ERROR"
          )
        }
        // Handle MongoDB errors
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("[RoleEnablementManager.disableRole] Database error:", error)
          throw new RoleEnablementError(
            "Database error occurred while disabling role",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message?.includes("connection") || error.message?.includes("timeout")) {
          console.error("[RoleEnablementManager.disableRole] Connection error:", error)
          throw new RoleEnablementError(
            "Database connection error. Please try again later.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
      }

      // Unknown error
      console.error("[RoleEnablementManager.disableRole] Unknown error:", error)
      throw new RoleEnablementError(
        "Failed to disable role at location",
        500,
        "DISABLE_FAILED"
      )
    }
  }

  /**
   * Get all enabled roles for a location at a specific date
   * 
   * @param locationId - The location ID
   * @param date - The date to check (defaults to current date)
   * @returns Array of LocationRoleEnablement documents with populated role details
   * @throws RoleEnablementError with appropriate status code and error message
   */
  async getEnabledRoles(
    locationId: mongoose.Types.ObjectId | string,
    date: Date = new Date()
  ): Promise<ILocationRoleEnablement[]> {
    try {
      // Validate input parameters
      if (!locationId) {
        throw new RoleEnablementError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleEnablementError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }

      // Validate date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new RoleEnablementError("Date must be a valid date", 400, "INVALID_DATE")
      }

      const enablements = await LocationRoleEnablement.find({
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        effectiveFrom: { $lte: date },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: date } },
        ],
      })
        .populate("roleId", "name color type")
        .populate("createdBy", "name email")
        .sort({ effectiveFrom: -1 })

      return enablements
    } catch (error) {
      // Re-throw RoleEnablementError as-is
      if (error instanceof RoleEnablementError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        // Handle MongoDB errors
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("[RoleEnablementManager.getEnabledRoles] Database error:", error)
          throw new RoleEnablementError(
            "Database error occurred while fetching enabled roles",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message?.includes("connection") || error.message?.includes("timeout")) {
          console.error("[RoleEnablementManager.getEnabledRoles] Connection error:", error)
          throw new RoleEnablementError(
            "Database connection error. Please try again later.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
      }

      // Unknown error
      console.error("[RoleEnablementManager.getEnabledRoles] Unknown error:", error)
      throw new RoleEnablementError(
        "Failed to fetch enabled roles",
        500,
        "FETCH_ENABLED_ROLES_FAILED"
      )
    }
  }

  /**
   * Check if a role is enabled at a location on a specific date
   * 
   * @param locationId - The location ID
   * @param roleId - The role ID
   * @param date - The date to check (defaults to current date)
   * @returns true if the role is enabled, false otherwise
   * @throws RoleEnablementError with appropriate status code and error message
   */
  async isRoleEnabled(
    locationId: mongoose.Types.ObjectId | string,
    roleId: mongoose.Types.ObjectId | string,
    date: Date = new Date()
  ): Promise<boolean> {
    try {
      // Validate input parameters
      if (!locationId) {
        throw new RoleEnablementError("Location ID is required", 400, "MISSING_LOCATION_ID")
      }
      if (!roleId) {
        throw new RoleEnablementError("Role ID is required", 400, "MISSING_ROLE_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
        throw new RoleEnablementError("Invalid location ID format", 400, "INVALID_LOCATION_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleEnablementError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }

      // Validate date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new RoleEnablementError("Date must be a valid date", 400, "INVALID_DATE")
      }

      const enablement = await LocationRoleEnablement.findOne({
        locationId: new mongoose.Types.ObjectId(locationId.toString()),
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        effectiveFrom: { $lte: date },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: date } },
        ],
      })

      return !!enablement
    } catch (error) {
      // Re-throw RoleEnablementError as-is
      if (error instanceof RoleEnablementError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        // Handle MongoDB errors
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("[RoleEnablementManager.isRoleEnabled] Database error:", error)
          throw new RoleEnablementError(
            "Database error occurred while checking role enablement",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message?.includes("connection") || error.message?.includes("timeout")) {
          console.error("[RoleEnablementManager.isRoleEnabled] Connection error:", error)
          throw new RoleEnablementError(
            "Database connection error. Please try again later.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
      }

      // Unknown error
      console.error("[RoleEnablementManager.isRoleEnabled] Unknown error:", error)
      throw new RoleEnablementError(
        "Failed to check role enablement",
        500,
        "CHECK_ENABLEMENT_FAILED"
      )
    }
  }

  /**
   * Get all locations where a role is enabled
   * 
   * @param roleId - The role ID
   * @param date - The date to check (defaults to current date)
   * @returns Array of LocationRoleEnablement documents with populated location details
   * @throws RoleEnablementError with appropriate status code and error message
   */
  async getLocationsForRole(
    roleId: mongoose.Types.ObjectId | string,
    date: Date = new Date()
  ): Promise<ILocationRoleEnablement[]> {
    try {
      // Validate input parameters
      if (!roleId) {
        throw new RoleEnablementError("Role ID is required", 400, "MISSING_ROLE_ID")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleEnablementError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }

      // Validate date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new RoleEnablementError("Date must be a valid date", 400, "INVALID_DATE")
      }

      const enablements = await LocationRoleEnablement.find({
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        effectiveFrom: { $lte: date },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: date } },
        ],
      })
        .populate("locationId", "name type lat lng")
        .populate("createdBy", "name email")
        .sort({ effectiveFrom: -1 })

      return enablements
    } catch (error) {
      // Re-throw RoleEnablementError as-is
      if (error instanceof RoleEnablementError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        // Handle MongoDB errors
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("[RoleEnablementManager.getLocationsForRole] Database error:", error)
          throw new RoleEnablementError(
            "Database error occurred while fetching locations for role",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message?.includes("connection") || error.message?.includes("timeout")) {
          console.error("[RoleEnablementManager.getLocationsForRole] Connection error:", error)
          throw new RoleEnablementError(
            "Database connection error. Please try again later.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
      }

      // Unknown error
      console.error("[RoleEnablementManager.getLocationsForRole] Unknown error:", error)
      throw new RoleEnablementError(
        "Failed to fetch locations for role",
        500,
        "FETCH_LOCATIONS_FAILED"
      )
    }
  }

  /**
   * Bulk enable a role at multiple locations
   * Creates enablement records for all specified locations in a single operation
   * 
   * @param params - BulkEnableRoleParams containing roleId, locationIds, dates, and userId
   * @returns Array of created LocationRoleEnablement documents
   * @throws RoleEnablementError with appropriate status code and error message
   */
  async bulkEnableRole(params: BulkEnableRoleParams): Promise<ILocationRoleEnablement[]> {
    try {
      const { roleId, locationIds, effectiveFrom, effectiveTo, userId } = params

      // Validate input parameters
      if (!roleId) {
        throw new RoleEnablementError("Role ID is required", 400, "MISSING_ROLE_ID")
      }
      if (!locationIds || locationIds.length === 0) {
        throw new RoleEnablementError("At least one location ID is required", 400, "MISSING_LOCATION_IDS")
      }
      if (!effectiveFrom) {
        throw new RoleEnablementError("Effective from date is required", 400, "MISSING_EFFECTIVE_FROM")
      }
      if (!userId) {
        throw new RoleEnablementError("User ID is required", 400, "MISSING_USER_ID")
      }

      // Validate date is valid
      if (!(effectiveFrom instanceof Date) || isNaN(effectiveFrom.getTime())) {
        throw new RoleEnablementError("Effective from date must be a valid date", 400, "INVALID_EFFECTIVE_FROM")
      }
      if (effectiveTo && (!(effectiveTo instanceof Date) || isNaN(effectiveTo.getTime()))) {
        throw new RoleEnablementError("Effective to date must be a valid date", 400, "INVALID_EFFECTIVE_TO")
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(roleId.toString())) {
        throw new RoleEnablementError("Invalid role ID format", 400, "INVALID_ROLE_ID")
      }
      if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
        throw new RoleEnablementError("Invalid user ID format", 400, "INVALID_USER_ID")
      }

      // Validate all location IDs
      for (const locationId of locationIds) {
        if (!mongoose.Types.ObjectId.isValid(locationId.toString())) {
          throw new RoleEnablementError(
            `Invalid location ID format: ${locationId}`,
            400,
            "INVALID_LOCATION_ID"
          )
        }
      }

      // Validate date range
      if (effectiveTo && effectiveFrom > effectiveTo) {
        throw new RoleEnablementError(
          "effectiveFrom must be before or equal to effectiveTo",
          400,
          "INVALID_DATE_RANGE"
        )
      }

      // Verify role exists
      const role = await Role.findById(new mongoose.Types.ObjectId(roleId.toString()))
      if (!role) {
        throw new RoleEnablementError(
          `Role with ID ${roleId} not found`,
          404,
          "ROLE_NOT_FOUND"
        )
      }

      // Verify all locations exist and are of type 'location'
      const locationObjectIds = locationIds.map(id => new mongoose.Types.ObjectId(id.toString()))
      const locations = await Location.find({
        _id: { $in: locationObjectIds },
      })

      if (locations.length !== locationIds.length) {
        const foundIds = locations.map(loc => loc._id.toString())
        const missingIds = locationIds.filter(id => !foundIds.includes(id.toString()))
        throw new RoleEnablementError(
          `Some locations not found: ${missingIds.join(", ")}`,
          404,
          "LOCATIONS_NOT_FOUND"
        )
      }

      // Check for overlapping enablements for each location
      const overlappingQuery: any = {
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        locationId: { $in: locationObjectIds },
      }

      if (effectiveTo) {
        overlappingQuery.$or = [
          {
            effectiveTo: null,
            effectiveFrom: { $lt: effectiveTo },
          },
          {
            effectiveFrom: { $lt: effectiveTo },
            effectiveTo: { $gt: effectiveFrom },
          },
        ]
      } else {
        overlappingQuery.$or = [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: { $gt: effectiveFrom },
          },
        ]
      }

      const overlapping = await LocationRoleEnablement.find(overlappingQuery)
      if (overlapping.length > 0) {
        const overlappingLocationIds = overlapping.map(e => e.locationId.toString())
        throw new RoleEnablementError(
          `Role is already enabled at some locations during the specified period. ` +
          `Locations with conflicts: ${overlappingLocationIds.join(", ")}`,
          409,
          "OVERLAPPING_ENABLEMENTS"
        )
      }

      // Create enablement records for all locations
      const enablements = locationObjectIds.map(locationId => ({
        locationId,
        roleId: new mongoose.Types.ObjectId(roleId.toString()),
        effectiveFrom,
        effectiveTo,
        createdBy: new mongoose.Types.ObjectId(userId.toString()),
      }))

      const created = await LocationRoleEnablement.insertMany(enablements)
      return created
    } catch (error) {
      // Re-throw RoleEnablementError as-is
      if (error instanceof RoleEnablementError) {
        throw error
      }

      // Handle database errors
      if (error instanceof Error) {
        if (error.name === "ValidationError") {
          console.error("[RoleEnablementManager.bulkEnableRole] Validation error:", error)
          throw new RoleEnablementError(
            `Validation error: ${error.message}`,
            400,
            "DATABASE_VALIDATION_ERROR"
          )
        }
        // Handle duplicate key errors (code 11000)
        if ((error as any).code === 11000) {
          console.error("[RoleEnablementManager.bulkEnableRole] Duplicate key error:", error)
          throw new RoleEnablementError(
            "Some duplicate enablements already exist. This may indicate overlapping enablements.",
            409,
            "DUPLICATE_ENABLEMENTS"
          )
        }
        // Handle MongoDB errors
        if (error.name === "MongoError" || error.name === "MongoServerError") {
          console.error("[RoleEnablementManager.bulkEnableRole] Database error:", error)
          throw new RoleEnablementError(
            "Database error occurred while bulk enabling roles",
            500,
            "DATABASE_ERROR"
          )
        }
        // Handle connection errors
        if (error.message?.includes("connection") || error.message?.includes("timeout")) {
          console.error("[RoleEnablementManager.bulkEnableRole] Connection error:", error)
          throw new RoleEnablementError(
            "Database connection error. Please try again later.",
            503,
            "DATABASE_CONNECTION_ERROR"
          )
        }
      }

      // Unknown error
      console.error("[RoleEnablementManager.bulkEnableRole] Unknown error:", error)
      throw new RoleEnablementError(
        "Failed to bulk enable role at locations",
        500,
        "BULK_ENABLE_FAILED"
      )
    }
  }
}
