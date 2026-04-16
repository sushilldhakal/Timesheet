import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import {
  teamAvailabilityQuerySchema,
  teamsAvailabilityResponseSchema,
} from "@/lib/validations/team"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { teamAvailabilityService } from "@/lib/services/team/team-availability-service"

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

    try {
      return await teamAvailabilityService.getAvailability(locationId, dateString)
    } catch (err) {
      console.error("[api/teams/availability GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch available teams" },
      }
    }
  },
})
