import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager, RoleEnablementError } from "@/lib/managers/role-enablement-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"
import {
  locationIdPathParamSchema as locationIdParamSchema,
  enableTeamSchema,
  roleEnablementQuerySchema,
  locationTeamsResponseSchema,
  teamEnablementResponseSchema,
} from "@/lib/validations/location"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const GET = createApiRoute({
  method: "GET",
  path: "/api/locations/{locationId}/teams",
  summary: "Get teams enabled at a location",
  description: "Teams enabled at a location with optional date filtering and employee counts",
  tags: ["Locations"],
  security: "adminAuth",
  request: {
    params: locationIdParamSchema,
    query: roleEnablementQuerySchema,
  },
  responses: {
    200: locationTeamsResponseSchema,
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
        data: { error: "Unauthorized" },
      }
    }

    const locationId = params?.locationId
    if (!locationId) {
      return {
        status: 400,
        data: { error: "Location ID is required" },
      }
    }

    const dateParam = query?.date
    const includeInactive = query?.includeInactive || false

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID" },
      }
    }

    try {
      await connectDB()

      const { Location } = await import("@/lib/db")
      const location = await Location.findById(locationId).lean()

      if (!location) {
        return {
          status: 404,
          data: { error: "Location not found" },
        }
      }

      const date = dateParam ? new Date(dateParam) : new Date()

      if (isNaN(date.getTime())) {
        return {
          status: 400,
          data: { error: "Invalid date parameter" },
        }
      }

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
            effectiveFrom: enablement.effectiveFrom,
            effectiveTo: enablement.effectiveTo,
            isActive: enablement.isActive,
            employeeCount,
          }
        })
      )

      void includeInactive

      return {
        status: 200,
        data: { teams: teamsWithCounts },
      }
    } catch (err) {
      console.error("[api/locations/[locationId]/teams GET]", err)

      if (err instanceof RoleEnablementError) {
        return {
          status: err.statusCode,
          data: { error: err.message },
        }
      }

      if (err instanceof Error && (err.message?.includes("connection") || err.message?.includes("timeout"))) {
        return {
          status: 503,
          data: { error: "Database connection error. Please try again later." },
        }
      }

      return {
        status: 500,
        data: { error: "Failed to fetch enabled teams" },
      }
    }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/locations/{locationId}/teams",
  summary: "Enable a team at a location",
  description: "Enable a scheduling team at a location with optional effective date range",
  tags: ["Locations"],
  security: "adminAuth",
  request: {
    params: locationIdParamSchema,
    body: enableTeamSchema,
  },
  responses: {
    201: teamEnablementResponseSchema,
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
        data: { error: "Unauthorized" },
      }
    }

    const locationId = params?.locationId
    if (!locationId) {
      return {
        status: 400,
        data: { error: "Location ID is required" },
      }
    }

    const { teamId, effectiveFrom, effectiveTo } = body!

    if (!teamId) {
      return {
        status: 400,
        data: { error: "Team ID is required" },
      }
    }

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return {
        status: 400,
        data: { error: "Invalid location ID" },
      }
    }

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return {
        status: 400,
        data: { error: "Invalid team ID" },
      }
    }

    try {
      await connectDB()

      const manager = new RoleEnablementManager()
      const enablement = (await manager.enableRole({
        locationId,
        roleId: teamId,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        userId: auth.sub,
      })) as any

      const populatedEnablement = await LocationRoleEnablement.findById(enablement._id).populate(
        "roleId",
        "name color"
      )

      if (!populatedEnablement) {
        return {
          status: 500,
          data: { error: "Failed to retrieve created enablement" },
        }
      }

      const teamData = populatedEnablement.roleId as any

      return {
        status: 201,
        data: {
          enablement: {
            id: populatedEnablement._id.toString(),
            locationId: populatedEnablement.locationId.toString(),
            teamId: teamData._id.toString(),
            teamName: teamData.name,
            teamColor: teamData.color,
            effectiveFrom: populatedEnablement.effectiveFrom,
            effectiveTo: populatedEnablement.effectiveTo,
            isActive: populatedEnablement.isActive,
          },
        },
      }
    } catch (err: any) {
      console.error("[api/locations/[locationId]/teams POST]", err)

      if (err instanceof RoleEnablementError) {
        return {
          status: err.statusCode,
          data: { error: err.message },
        }
      }

      if (err instanceof Error && (err.message?.includes("connection") || err.message?.includes("timeout"))) {
        return {
          status: 503,
          data: { error: "Database connection error. Please try again later." },
        }
      }

      return {
        status: 500,
        data: { error: "Failed to enable team at location" },
      }
    }
  },
})
