import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import {
  locationIdPathParamSchema as locationIdParamSchema,
  enableTeamSchema,
  roleEnablementQuerySchema,
  locationTeamsResponseSchema,
  teamEnablementResponseSchema,
} from "@/lib/validations/location"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { locationTeamsService } from "@/lib/services/location/location-teams-service"

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

    try {
      return await locationTeamsService.listEnabledTeams({ auth, locationId, query })
    } catch (err) {
      console.error("[api/locations/[locationId]/teams GET]", err)
      const mapped = locationTeamsService.mapError(err)
      if (mapped) return mapped

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

    try {
      return await locationTeamsService.enableTeam({ auth, locationId, body })
    } catch (err: any) {
      console.error("[api/locations/[locationId]/teams POST]", err)
      const mapped = locationTeamsService.mapError(err)
      if (mapped) return mapped

      return {
        status: 500,
        data: { error: "Failed to enable team at location" },
      }
    }
  },
})
