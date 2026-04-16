import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  absenceIdParamSchema, 
  affectedShiftsResponseSchema, 
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { absenceActionsService } from "@/lib/services/absence/absence-actions-service"

/**
 * GET /api/absences/[id]/affected-shifts
 * Get shifts affected by a leave record
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/absences/{id}/affected-shifts',
  summary: 'Get affected shifts for absence',
  description: 'Get shifts affected by a leave record',
  tags: ['Absences'],
  security: 'adminAuth',
  request: {
    params: absenceIdParamSchema,
  },
  responses: {
    200: affectedShiftsResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!

    return {
      status: 200,
      data: await absenceActionsService.affectedShifts(id),
    }
  }
})