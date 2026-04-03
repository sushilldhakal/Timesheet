import { createApiRoute } from "@/lib/api/create-api-route"
import {
  absenceIdParamSchema,
  denyAbsenceSchema,
  denyAbsenceResponseSchema,
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { AbsenceManager } = await import("@/lib/managers/absence-manager")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!
    const { denierId, reason } = body!

    try {
      await connectDB()
      const absenceManager = new AbsenceManager()
      const leaveRecord = await absenceManager.denyLeaveRecord(id, denierId, reason)

      return {
        status: 200,
        data: { leaveRecord },
      }
    } catch (err: unknown) {
      console.error("[api/absences/[id]/deny PATCH]", err)
      const message = err instanceof Error ? err.message : ""

      if (message.includes("not found")) {
        return { status: 404, data: { error: message } }
      }

      if (message.includes("PENDING")) {
        return { status: 400, data: { error: message } }
      }

      return {
        status: 500,
        data: { error: "Failed to deny leave record" },
      }
    }
  },
})
