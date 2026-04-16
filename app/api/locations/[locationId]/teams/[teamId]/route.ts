import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import {
  locationTeamParamsSchema,
  updateEnablementSchema,
  teamEnablementResponseSchema,
} from "@/lib/validations/location"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { locationTeamsService } from "@/lib/services/location/location-teams-service"

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

    try {
      return await locationTeamsService.disableTeam({ auth, locationId, teamId })
    } catch (err: any) {
      console.error("[api/locations/[locationId]/teams/[teamId] DELETE]", err)
      const mapped = locationTeamsService.mapError(err)
      if (mapped) return mapped

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

    try {
      void effectiveFrom
      void effectiveTo
      return await locationTeamsService.updateEnablement({ auth, locationId, teamId, body })
    } catch (err: any) {
      console.error("[api/locations/[locationId]/teams/[teamId] PATCH]", err)
      const mapped = locationTeamsService.mapError(err)
      if (mapped) return mapped

      return {
        status: 500,
        data: { error: "Failed to update team enablement" },
      }
    }
  },
})
