import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager } from "@/lib/managers/role-enablement-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import {
  teamAvailabilityQuerySchema,
  teamsAvailabilityResponseSchema,
} from "@/lib/validations/team"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const GET = createApiRoute({
  method: "GET",
  path: "/api/teams/availability",
  summary: "Get available teams for a location",
  description: "Get teams enabled at a location on a date with employee counts",
  tags: ["Teams"],
  security: "adminAuth",
  request: {
    query: teamAvailabilityQuerySchema,
  },
  responses: {
    200: teamsAvailabilityResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" },
      }
    }

    const locationId = query?.locationId
    const dateString = query?.date

    if (!locationId) {
      return {
        status: 400,
        data: { error: "Location ID is required" },
      }
    }

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID format" },
      }
    }

    try {
      await connectDB()

      const date = dateString ? new Date(dateString) : new Date()
      const manager = new RoleEnablementManager()

      const enablements = await manager.getEnabledRoles(locationId, date)

      const teamsWithCounts = await Promise.all(
        enablements.map(async (enablement) => {
          const roleId = enablement.roleId as any

          const employeeCount = await EmployeeRoleAssignment.countDocuments({
            roleId: roleId._id,
            locationId: new mongoose.Types.ObjectId(locationId),
            validFrom: { $lte: date },
            $or: [{ validTo: null }, { validTo: { $gte: date } }],
          })

          return {
            teamId: roleId._id.toString(),
            teamName: roleId.name,
            teamColor: roleId.color,
            employeeCount,
            isEnabled: true,
          }
        })
      )

      return {
        status: 200,
        data: { teams: teamsWithCounts },
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "CDN-Cache-Control": "public, max-age=300",
        },
      }
    } catch (err) {
      console.error("[api/teams/availability GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch available teams" },
      }
    }
  },
})
