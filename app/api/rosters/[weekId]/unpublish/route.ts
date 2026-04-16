import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { apiErrors } from "@/lib/api/api-error"
import { rosterService } from "@/lib/services/roster/roster-service"

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
    const weekId = params!.weekId
    if (!ctx) throw apiErrors.unauthorized()
    const data = await rosterService.unpublishRoster(weekId)
    return { status: 200, data }
  }
});
