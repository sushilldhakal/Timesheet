import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager } from "@/lib/managers/role-enablement-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { 
  roleAvailabilityQuerySchema,
  rolesAvailabilityResponseSchema,
} from "@/lib/validations/role"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/roles/availability',
  summary: 'Get available roles for a location',
  description: 'Get available roles for a location on a specific date with employee counts',
  tags: ['Roles'],
  security: 'adminAuth',
  request: {
    query: roleAvailabilityQuerySchema,
  },
  responses: {
    200: rolesAvailabilityResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const locationId = query?.locationId
    const dateString = query?.date

    if (!locationId) {
      return {
        status: 400,
        data: { error: "Location ID is required" }
      }
    }

    // Validate locationId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID format" }
      }
    }

    try {
      await connectDB()

      const date = dateString ? new Date(dateString) : new Date()
      const manager = new RoleEnablementManager()

      // Get enabled roles for the location
      const enablements = await manager.getEnabledRoles(locationId, date)

      // Get employee counts for each role at this location
      const rolesWithCounts = await Promise.all(
        enablements.map(async (enablement) => {
          const roleId = enablement.roleId as any
          
          // Count employees assigned to this role at this location on the specified date
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
            employeeCount,
            isEnabled: true,
          }
        })
      )

      return {
        status: 200,
        data: { roles: rolesWithCounts },
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "CDN-Cache-Control": "public, max-age=300"
        }
      }
    } catch (err) {
      console.error("[api/roles/availability GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch available roles" }
      }
    }
  }
})