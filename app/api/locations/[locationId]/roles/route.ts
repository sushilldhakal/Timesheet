import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager, RoleEnablementError } from "@/lib/managers/role-enablement-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"
import { formatSuccess, formatError } from "@/lib/utils/api/api-response"
import { 
  locationIdPathParamSchema as locationIdParamSchema,
  enableRoleSchema,
  roleEnablementQuerySchema,
  locationRolesResponseSchema,
  roleEnablementResponseSchema,
} from "@/lib/validations/location"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/locations/{locationId}/roles',
  summary: 'Get all roles enabled at a location',
  description: 'Get all roles enabled at a location with optional date filtering and employee counts',
  tags: ['Locations'],
  security: 'adminAuth',
  request: {
    params: locationIdParamSchema,
    query: roleEnablementQuerySchema,
  },
  responses: {
    200: locationRolesResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const locationId = params?.locationId
    if (!locationId) {
      return {
        status: 400,
        data: { error: "Location ID is required" }
      }
    }

    const dateParam = query?.date
    const includeInactive = query?.includeInactive || false

    // Validate locationId
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID" }
      }
    }

    try {
      await connectDB()

      const { Location } = await import("@/lib/db")
      const location = await Location.findById(locationId).lean()

      if (!location) {
        return {
          status: 404,
          data: { error: "Location not found" }
        }
      }

      const date = dateParam ? new Date(dateParam) : new Date()
      
      // Validate date
      if (isNaN(date.getTime())) {
        return {
          status: 400,
          data: { error: "Invalid date parameter" }
        }
      }

      const manager = new RoleEnablementManager()

      // Get enabled roles
      const enablements = await manager.getEnabledRoles(locationId, date)

      // Get employee counts for each role at this location
      const rolesWithCounts = await Promise.all(
        enablements.map(async (enablement) => {
          const roleId = enablement.roleId as any
          
          // Count employees assigned to this role at this location
          const employeeCount = await EmployeeRoleAssignment.countDocuments({
            roleId: roleId._id,
            locationId: new mongoose.Types.ObjectId(locationId),
            validFrom: { $lte: date },
            $or: [
              { validTo: null },
              { validTo: { $gte: date } },
            ],
          })

          return {
            roleId: roleId._id.toString(),
            roleName: roleId.name,
            roleColor: roleId.color,
            effectiveFrom: enablement.effectiveFrom,
            effectiveTo: enablement.effectiveTo,
            isActive: enablement.isActive,
            employeeCount,
          }
        })
      )

      return {
        status: 200,
        data: { roles: rolesWithCounts }
      }
    } catch (err) {
      console.error("[api/locations/[locationId]/roles GET]", err)

      // Handle RoleEnablementError
      if (err instanceof RoleEnablementError) {
        return {
          status: err.statusCode,
          data: { error: err.message }
        }
      }

      // Handle database connection errors
      if (err instanceof Error && (err.message?.includes("connection") || err.message?.includes("timeout"))) {
        return {
          status: 503,
          data: { error: "Database connection error. Please try again later." }
        }
      }

      return {
        status: 500,
        data: { error: "Failed to fetch enabled roles" }
      }
    }
  }
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/locations/{locationId}/roles',
  summary: 'Enable a role at a location',
  description: 'Enable a role at a location with optional effective date range',
  tags: ['Locations'],
  security: 'adminAuth',
  request: {
    params: locationIdParamSchema,
    body: enableRoleSchema,
  },
  responses: {
    201: roleEnablementResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const locationId = params?.locationId
    if (!locationId) {
      return {
        status: 400,
        data: { error: "Location ID is required" }
      }
    }

    const { roleId, effectiveFrom, effectiveTo } = body!

    if (!roleId) {
      return {
        status: 400,
        data: { error: "Role ID is required" }
      }
    }

    // Validate locationId
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID" }
      }
    }

    // Validate roleId
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return {
        status: 400,
        data: { error: "Invalid role ID" }
      }
    }

    try {
      await connectDB()

      const manager = new RoleEnablementManager()
      const enablement = await manager.enableRole({
        locationId,
        roleId,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        userId: auth.sub,
      }) as any // Manager returns Document but types as interface

      // Populate role details
      const populatedEnablement = await LocationRoleEnablement.findById(enablement._id)
        .populate("roleId", "name color")

      if (!populatedEnablement) {
        return {
          status: 500,
          data: { error: "Failed to retrieve created enablement" }
        }
      }

      const roleData = populatedEnablement.roleId as any

      return {
        status: 201,
        data: {
          enablement: {
            id: populatedEnablement._id.toString(),
            locationId: populatedEnablement.locationId.toString(),
            roleId: roleData._id.toString(),
            roleName: roleData.name,
            roleColor: roleData.color,
            effectiveFrom: populatedEnablement.effectiveFrom,
            effectiveTo: populatedEnablement.effectiveTo,
            isActive: populatedEnablement.isActive,
          },
        }
      }
    } catch (err: any) {
      console.error("[api/locations/[locationId]/roles POST]", err)
      
      // Handle RoleEnablementError
      if (err instanceof RoleEnablementError) {
        return {
          status: err.statusCode,
          data: { error: err.message }
        }
      }

      // Handle database connection errors
      if (err instanceof Error && (err.message?.includes("connection") || err.message?.includes("timeout"))) {
        return {
          status: 503,
          data: { error: "Database connection error. Please try again later." }
        }
      }

      return {
        status: 500,
        data: { error: "Failed to enable role at location" }
      }
    }
  }
})