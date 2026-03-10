import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Validation schemas
const weekIdParamSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)")
})

const generateRequestSchema = z.object({
  mode: z.enum(["copy", "schedules"]),
  copyFromWeekId: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  includeEmploymentTypes: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
})

const generateResponseSchema = z.object({
  message: z.string(),
  shiftsCreated: z.number()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  issues: z.record(z.string(), z.array(z.string())).optional(),
  details: z.string().optional()
})

/** POST /api/rosters/[weekId]/generate - Generate roster from schedules or copy from another week */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/rosters/{weekId}/generate',
  summary: 'Generate roster from schedules or copy from another week',
  description: 'Generate roster shifts from employee schedules or copy from another week',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
    body: generateRequestSchema
  },
  responses: {
    200: generateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const weekId = params!.weekId

    try {
      await connectDB()

      const rosterManager = new RosterManager()

      // Check if roster exists, create if not
      const existingRoster = await rosterManager.getRoster(weekId)
      if (!existingRoster.success) {
        const createResult = await rosterManager.createRoster(weekId)
        if (!createResult.success) {
          return { 
            status: 400, 
            data: { 
              error: createResult.error, 
              message: createResult.message 
            } 
          }
        }
      }

      // Generate based on mode
      if (body!.mode === "copy") {
        if (!body!.copyFromWeekId) {
          return { 
            status: 400, 
            data: { 
              error: "copyFromWeekId is required when mode is 'copy'" 
            } 
          }
        }

        const result = await rosterManager.copyRosterFromWeek(weekId, body!.copyFromWeekId)

        if (!result.success) {
          return { 
            status: 400, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }

        return { 
          status: 200, 
          data: {
            message: "Roster copied successfully",
            shiftsCreated: result.shiftsCreated,
          } 
        }
      } else {
        // Mode: schedules
        const result = await rosterManager.populateRosterFromSchedules(
          weekId,
          body!.includeEmploymentTypes,
          body!.locationIds
        )

        if (!result.success) {
          return { 
            status: 400, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }

        return { 
          status: 200, 
          data: {
            message: "Roster generated from schedules",
            shiftsCreated: result.shiftsCreated,
          } 
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/generate POST]", err)
      return { 
        status: 500, 
        data: {
          error: "Failed to generate roster",
          details: process.env.NODE_ENV === "development" ? message : undefined,
        } 
      }
    }
  }
});
