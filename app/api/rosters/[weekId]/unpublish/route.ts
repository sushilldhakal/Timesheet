import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Validation schemas
const weekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)")
})

const unpublishResponseSchema = z.object({
  message: z.string(),
  roster: z.any()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.string().optional()
})

/** PUT /api/rosters/[weekId]/unpublish - Unpublish a roster */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/rosters/{weekId}/unpublish',
  summary: 'Unpublish a roster',
  description: 'Unpublish a roster to hide it from employees',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema
  },
  responses: {
    200: unpublishResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const weekId = params!.weekId

    try {
      await connectDB()
      
      const rosterManager = new RosterManager()
      const result = await rosterManager.unpublishRoster(weekId)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return { 
            status: 404, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }
        return { 
          status: 500, 
          data: { 
            error: result.error, 
            message: result.message 
          } 
        }
      }
      
      return { 
        status: 200, 
        data: { 
          message: "Roster unpublished successfully",
          roster: result.roster 
        } 
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/unpublish PUT]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to unpublish roster", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        } 
      }
    }
  }
});
