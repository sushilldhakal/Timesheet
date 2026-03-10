import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  absenceIdParamSchema, 
  approveAbsenceSchema,
  approveAbsenceResponseSchema, 
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { AbsenceManager } = await import("@/lib/managers/absence-manager")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!
    const { approverId } = body!

    try {
      await connectDB()
      const absenceManager = new AbsenceManager()
      const leaveRecord = await absenceManager.approveLeaveRecord(id, approverId)

      // Get affected shifts
      const affectedShifts = await absenceManager.identifyReplacementNeeds(id)

      return {
        status: 200,
        data: {
          leaveRecord,
          affectedShifts: affectedShifts.map((shift) => ({
            shiftId: shift._id.toString(),
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
          })),
        }
      }
    } catch (err: any) {
      console.error("[api/absences/[id]/approve PATCH]", err)

      if (err.message?.includes("not found")) {
        return { status: 404, data: { error: err.message } }
      }

      return {
        status: 500,
        data: { error: "Failed to approve leave record" }
      }
    }
  }
})