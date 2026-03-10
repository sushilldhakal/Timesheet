import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
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
      await connectDB()
      
      const rosterManager = new RosterManager()
      
      // Create roster
      const createResult = await rosterManager.createRoster(weekId)
      
      if (!createResult.success) {
        return {
          status: 400,
          data: { error: createResult.error || "Failed to create roster" }
        }
      }
      
      // Auto-populate if requested
      if (autoPopulate) {
        const populateResult = await rosterManager.populateRosterFromSchedules(weekId)
        
        if (!populateResult.success) {
          return {
            status: 207, // Multi-status: roster created but population failed
            data: { 
              roster: createResult.roster,
              shiftsGenerated: 0
            }
          }
        }
        
        return {
          status: 201,
          data: { 
            roster: createResult.roster,
            shiftsGenerated: populateResult.shiftsCreated || 0
          }
        }
      }
      
      return {
        status: 201,
        data: { 
          roster: createResult.roster,
          shiftsGenerated: 0
        }
      }
    } catch (err) {
      console.error("[api/rosters POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create roster" }
      }
    }
  }
})