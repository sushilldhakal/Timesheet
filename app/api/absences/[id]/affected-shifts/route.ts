import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  absenceIdParamSchema, 
  affectedShiftsResponseSchema, 
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { AbsenceManager } = await import("@/lib/managers/absence-manager")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!

    try {
      await connectDB()
      const absenceManager = new AbsenceManager()
      const affectedShifts = await absenceManager.identifyReplacementNeeds(id)

      return {
        status: 200,
        data: {
          affectedShifts: affectedShifts.map((shift) => ({
            shiftId: shift._id.toString(),
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            locationId: shift.locationId.toString(),
            roleId: shift.roleId.toString(),
          })),
        }
      }
    } catch (err: any) {
      console.error("[api/absences/[id]/affected-shifts GET]", err)

      if (err.message?.includes("not found")) {
        return { status: 404, data: { error: err.message } }
      }

      return {
        status: 500,
        data: { error: "Failed to fetch affected shifts" }
      }
    }
  }
})