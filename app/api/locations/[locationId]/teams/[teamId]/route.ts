import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager, RoleEnablementError } from "@/lib/managers/role-enablement-manager"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"
import {
  locationTeamParamsSchema,
  updateEnablementSchema,
  teamEnablementResponseSchema,
} from "@/lib/validations/location"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/locations/{locationId}/teams/{teamId}",
  summary: "Disable a team at a location",
  description: "Disable a team at a location (sets effectiveTo to now)",
  tags: ["Locations"],
  security: "adminAuth",
  request: {
    params: locationTeamParamsSchema,
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
        data: { error: "Unauthorized" },
      }
    }

    const { locationId, teamId } = params!

    if (!locationId || !teamId) {
      return {
        status: 400,
        data: { error: "Location ID and Team ID are required" },
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
      await manager.disableRole(locationId, teamId, auth.sub)

      return {
        status: 200,
        data: { message: "Team disabled at location" },
      }
    } catch (err: any) {
      console.error("[api/locations/[locationId]/teams/[teamId] DELETE]", err)

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
        data: { error: "Failed to disable team at location" },
      }
    }
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/locations/{locationId}/teams/{teamId}",
  summary: "Update team enablement dates",
  description: "Update the effective date range for a team enablement at a location",
  tags: ["Locations"],
  security: "adminAuth",
  request: {
    params: locationTeamParamsSchema,
    body: updateEnablementSchema,
  },
  responses: {
    200: teamEnablementResponseSchema,
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
        data: { error: "Unauthorized" },
      }
    }

    const { locationId, teamId } = params!

    if (!locationId || !teamId) {
      return {
        status: 400,
        data: { error: "Location ID and Team ID are required" },
      }
    }

    const { effectiveFrom, effectiveTo } = body!

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

      const now = new Date()
      const enablement = await LocationRoleEnablement.findOne({
        locationId: new mongoose.Types.ObjectId(locationId),
        roleId: new mongoose.Types.ObjectId(teamId),
        effectiveFrom: { $lte: now },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }],
      })

      if (!enablement) {
        return {
          status: 404,
          data: { error: "No active team enablement found" },
        }
      }

      if (effectiveFrom) {
        const newEffectiveFrom = new Date(effectiveFrom)

        if (isNaN(newEffectiveFrom.getTime())) {
          return {
            status: 400,
            data: { error: "Invalid effectiveFrom date" },
          }
        }

        if (enablement.effectiveTo && newEffectiveFrom > enablement.effectiveTo) {
          return {
            status: 400,
            data: { error: "effectiveFrom must be before or equal to effectiveTo" },
          }
        }

        enablement.effectiveFrom = newEffectiveFrom
      }

      if (effectiveTo !== undefined) {
        const newEffectiveTo = effectiveTo ? new Date(effectiveTo) : null

        if (newEffectiveTo && isNaN(newEffectiveTo.getTime())) {
          return {
            status: 400,
            data: { error: "Invalid effectiveTo date" },
          }
        }

        if (newEffectiveTo && enablement.effectiveFrom > newEffectiveTo) {
          return {
            status: 400,
            data: { error: "effectiveFrom must be before or equal to effectiveTo" },
          }
        }

        enablement.effectiveTo = newEffectiveTo
      }

      await enablement.save()

      await enablement.populate("roleId", "name color")

      const teamData = enablement.roleId as any

      return {
        status: 200,
        data: {
          enablement: {
            id: enablement._id.toString(),
            locationId: enablement.locationId.toString(),
            teamId: teamData._id.toString(),
            teamName: teamData.name,
            teamColor: teamData.color,
            effectiveFrom: enablement.effectiveFrom,
            effectiveTo: enablement.effectiveTo,
            isActive: enablement.isActive,
          },
        },
      }
    } catch (err: any) {
      console.error("[api/locations/[locationId]/teams/[teamId] PATCH]", err)

      if (err.name === "ValidationError") {
        return {
          status: 400,
          data: { error: `Validation error: ${err.message}` },
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
        data: { error: "Failed to update team enablement" },
      }
    }
  },
})
