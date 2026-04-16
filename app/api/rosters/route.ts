import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { rosterService } from "@/lib/services/roster/roster-service"
import { 
  createRosterSchema,
  createRosterResponseSchema,
} from "@/lib/validations/roster"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/rosters',
  summary: 'Create a new roster',
  description: 'Create a new roster for a specific week with optional auto-population from schedules',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    body: createRosterSchema,
  },
  responses: {
    201: createRosterResponseSchema,
    207: createRosterResponseSchema, // Multi-status: roster created but population failed
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { weekId, autoPopulate = true } = body!

    try {
      return await rosterService.createRoster(weekId, autoPopulate)
    } catch (err) {
      console.error("[api/rosters POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create roster" }
      }
    }
  }
})