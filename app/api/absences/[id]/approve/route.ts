import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  absenceIdParamSchema, 
  approveAbsenceSchema,
  approveAbsenceResponseSchema, 
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { absenceActionsService } from "@/lib/services/absence/absence-actions-service"

/**
 * PATCH /api/absences/[id]/approve
 * Approve a leave record
 */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/absences/{id}/approve',
  summary: 'Approve absence request',
  description: 'Approve a leave record and get affected shifts',
  tags: ['Absences'],
  security: 'adminAuth',
  request: {
    params: absenceIdParamSchema,
    body: approveAbsenceSchema,
  },
  responses: {
    200: approveAbsenceResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!
    const { approverId } = body!

    return {
      status: 200,
      data: await absenceActionsService.approve(id, approverId),
    }
  }
})