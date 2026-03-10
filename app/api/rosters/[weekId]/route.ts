import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { 
  weekIdParamSchema,
  rosterResponseSchema,
} from "@/lib/validations/roster"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/rosters/{weekId}',
  summary: 'Get roster for a specific week',
  description: 'Get roster details and all shifts for a specific week',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
  },
  responses: {
    200: z.object({ roster: rosterResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const weekId = params!.weekId

    try {
      await connectDB()
      
      const rosterManager = new RosterManager()
      const result = await rosterManager.getRoster(weekId)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return {
            status: 404,
            data: { error: result.message || "Roster not found" }
          }
        }
        return {
          status: 500,
          data: { error: result.message || "Failed to fetch roster" }
        }
      }
      
      return {
        status: 200,
        data: { roster: result.roster }
      }
    } catch (err) {
      console.error("[api/rosters/[weekId] GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch roster" }
      }
    }
  }
})

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/rosters/{weekId}',
  summary: 'Delete a roster',
  description: 'Delete a roster and all its shifts (only if not published)',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
  },
  responses: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const weekId = params!.weekId

    try {
      await connectDB()
      
      const rosterManager = new RosterManager()
      const result = await rosterManager.deleteRoster(weekId)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return {
            status: 404,
            data: { error: result.message || "Roster not found" }
          }
        }
        if (result.error === "ROSTER_PUBLISHED") {
          return {
            status: 403,
            data: { error: result.message || "Cannot delete published roster" }
          }
        }
        return {
          status: 500,
          data: { error: result.message || "Failed to delete roster" }
        }
      }
      
      return {
        status: 200,
        data: { message: "Roster deleted successfully" }
      }
    } catch (err) {
      console.error("[api/rosters/[weekId] DELETE]", err)
      return {
        status: 500,
        data: { error: "Failed to delete roster" }
      }
    }
  }
})