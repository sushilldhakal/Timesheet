import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope } from "@/lib/auth/scheduling-scope"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Validation schemas
const weekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)")
})

const publishResponseSchema = z.object({
  message: z.string(),
  roster: z.any(),
  publishedCount: z.number().optional(),
})

const publishScopedBodySchema = z.object({
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid location ID"),
  roleIds: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid role ID")).min(1),
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.string().optional()
})

/** PUT /api/rosters/[weekId]/publish - Publish a roster */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/rosters/{weekId}/publish',
  summary: 'Publish a roster',
  description: 'Publish a roster to make it visible to employees',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema
  },
  responses: {
    200: publishResponseSchema,
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
      const result = await rosterManager.publishRoster(weekId)
      
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
          message: "Roster published successfully",
          roster: result.roster 
        } 
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/publish PUT]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to publish roster", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        } 
      }
    }
  }
})

/** POST /api/rosters/[weekId]/publish — publish only shifts in location + role scope */
export const POST = createApiRoute({
  method: "POST",
  path: "/api/rosters/{weekId}/publish",
  summary: "Publish scoped shifts",
  description: "Set shift.status to published for shifts matching location and roles",
  tags: ["rosters"],
  security: "adminAuth",
  request: {
    params: weekIdParamSchema,
    body: publishScopedBodySchema,
  },
  responses: {
    200: publishResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const weekId = params!.weekId
    const { locationId, roleIds } = body!

    const scope = await assertManagerSchedulingScope(ctx, locationId, roleIds)
    if (!scope.ok) {
      return { status: scope.status, data: { error: scope.error } }
    }

    try {
      await connectDB()
      const rosterManager = new RosterManager()
      const result = await rosterManager.publishShiftsInScope(weekId, locationId, roleIds)

      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return {
            status: 404,
            data: { error: result.error, message: result.message },
          }
        }
        return {
          status: 500,
          data: { error: result.error, message: result.message },
        }
      }

      return {
        status: 200,
        data: {
          message: `Published ${result.publishedCount} shift(s)`,
          roster: result.roster,
          publishedCount: result.publishedCount,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/publish POST]", err)
      return {
        status: 500,
        data: {
          error: "Failed to publish shifts",
          details: process.env.NODE_ENV === "development" ? message : undefined,
        },
      }
    }
  },
})
