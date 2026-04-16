import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { rosterService } from "@/lib/services/roster/roster-service"

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
      return await rosterService.generateRoster(weekId, body)
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
