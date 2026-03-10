import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager, RoleEnablementError } from "@/lib/managers/role-enablement-manager"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"
import { formatSuccess, formatError } from "@/lib/utils/api/api-response"
import { 
  locationRoleParamsSchema,
  updateEnablementSchema,
  roleEnablementResponseSchema,
} from "@/lib/validations/location"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/locations/{locationId}/roles/{roleId}',
  summary: 'Disable a role at a location',
  description: 'Disable a role at a location (sets effectiveTo to now)',
  tags: ['Locations'],
  security: 'adminAuth',
  request: {
    params: locationRoleParamsSchema,
  },
  responses: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { locationId, roleId } = params!

    if (!locationId || !roleId) {
      return {
        status: 400,
        data: { error: "Location ID and Role ID are required" }
      }
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID" }
      }
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return {
        status: 400,
        data: { error: "Invalid role ID" }
      }
    }

    try {
      await connectDB()

      const manager = new RoleEnablementManager()
      await manager.disableRole(locationId, roleId, auth.sub)

      return {
        status: 200,
        data: { message: "Role disabled at location" }
      }
    } catch (err: any) {
      console.error("[api/locations/[locationId]/roles/[roleId] DELETE]", err)

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
        data: { error: "Failed to disable role at location" }
      }
    }
  }
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/locations/{locationId}/roles/{roleId}',
  summary: 'Update role enablement dates',
  description: 'Update the effective date range for a role enablement at a location',
  tags: ['Locations'],
  security: 'adminAuth',
  request: {
    params: locationRoleParamsSchema,
    body: updateEnablementSchema,
  },
  responses: {
    200: roleEnablementResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
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

    const { locationId, roleId } = params!

    if (!locationId || !roleId) {
      return {
        status: 400,
        data: { error: "Location ID and Role ID are required" }
      }
    }

    const { effectiveFrom, effectiveTo } = body!

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID" }
      }
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return {
        status: 400,
        data: { error: "Invalid role ID" }
      }
    }

    try {
      await connectDB()

      // Find the current active enablement
      const now = new Date()
      const enablement = await LocationRoleEnablement.findOne({
        locationId: new mongoose.Types.ObjectId(locationId),
        roleId: new mongoose.Types.ObjectId(roleId),
        effectiveFrom: { $lte: now },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gt: now } },
        ],
      })

      if (!enablement) {
        return {
          status: 404,
          data: { error: "No active role enablement found" }
        }
      }

      // Update the dates
      if (effectiveFrom) {
        const newEffectiveFrom = new Date(effectiveFrom)
        
        // Validate date is valid
        if (isNaN(newEffectiveFrom.getTime())) {
          return {
            status: 400,
            data: { error: "Invalid effectiveFrom date" }
          }
        }
        
        // Validate date range
        if (enablement.effectiveTo && newEffectiveFrom > enablement.effectiveTo) {
          return {
            status: 400,
            data: { error: "effectiveFrom must be before or equal to effectiveTo" }
          }
        }
        
        enablement.effectiveFrom = newEffectiveFrom
      }

      if (effectiveTo !== undefined) {
        const newEffectiveTo = effectiveTo ? new Date(effectiveTo) : null
        
        // Validate date is valid
        if (newEffectiveTo && isNaN(newEffectiveTo.getTime())) {
          return {
            status: 400,
            data: { error: "Invalid effectiveTo date" }
          }
        }
        
        // Validate date range
        if (newEffectiveTo && enablement.effectiveFrom > newEffectiveTo) {
          return {
            status: 400,
            data: { error: "effectiveFrom must be before or equal to effectiveTo" }
          }
        }
        
        enablement.effectiveTo = newEffectiveTo
      }

      await enablement.save()

      // Populate role details
      await enablement.populate("roleId", "name color type")

      const roleData = enablement.roleId as any

      return {
        status: 200,
        data: {
          enablement: {
            id: enablement._id.toString(),
            locationId: enablement.locationId.toString(),
            roleId: enablement.roleId.toString(),
            roleName: roleData.name,
            roleColor: roleData.color,
            effectiveFrom: enablement.effectiveFrom,
            effectiveTo: enablement.effectiveTo,
            isActive: enablement.isActive,
          },
        }
      }
    } catch (err: any) {
      console.error("[api/locations/[locationId]/roles/[roleId] PATCH]", err)

      // Handle database validation errors
      if (err.name === "ValidationError") {
        return {
          status: 400,
          data: { error: `Validation error: ${err.message}` }
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
        data: { error: "Failed to update role enablement" }
      }
    }
  }
})