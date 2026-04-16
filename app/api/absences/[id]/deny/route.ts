import { createApiRoute } from "@/lib/api/create-api-route"
import {
  absenceIdParamSchema,
  denyAbsenceSchema,
  denyAbsenceResponseSchema,
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { absenceActionsService } from "@/lib/services/absence/absence-actions-service"

/**
 * PATCH /api/absences/[id]/deny
 * Deny a leave record (PENDING only).
 */
export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/absences/{id}/deny",
  summary: "Deny absence request",
  description: "Deny a leave record with a reason",
  tags: ["Absences"],
  security: "adminAuth",
  request: {
    params: absenceIdParamSchema,
    body: denyAbsenceSchema,
  },
  responses: {
    200: denyAbsenceResponseSchema,
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
    const { denierId, reason } = body!

    return { status: 200, data: await absenceActionsService.deny(id, denierId, reason) }
  },
})
