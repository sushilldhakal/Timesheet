import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { AutoFillEngine, EmploymentType } from "@/lib/managers/auto-fill-engine"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  weekIdParamSchema,
  autoFillRequestSchema,
  autoFillResponseSchema
} from "@/lib/validations/roster-operations"
import { errorResponseSchema } from "@/lib/validations/auth"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/rosters/{weekId}/auto-fill',
  summary: 'Auto-fill roster',
  description: 'Auto-fill roster with shifts based on employee schedules',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
    body: autoFillRequestSchema
  },
  responses: {
    200: autoFillResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params || !body) {
      return { status: 400, data: { error: "Week ID and request body are required" } };
    }

    const { weekId } = params!;
    const { organizationId, employmentTypes, validateAvailability, validateCompliance } = body!;

    // Default to FULL_TIME and PART_TIME if not specified
    const types: EmploymentType[] = employmentTypes || ["FULL_TIME", "PART_TIME"]

    try {
      await connectDB()

      // Find or create the roster
      const { Roster } = await import("@/lib/db")
      let roster = await Roster.findOne({ weekId })

      if (!roster) {
        // Create a new roster for this week
        const { getWeekBoundaries } = await import("@/lib/db/schemas/roster")
        const { start, end } = getWeekBoundaries(weekId)
        const [yearStr, weekStr] = weekId.split("-W")

        roster = await Roster.create({
          weekId: weekId,
          year: parseInt(yearStr, 10),
          weekNumber: parseInt(weekStr, 10),
          weekStartDate: start,
          weekEndDate: end,
          shifts: [],
          status: "draft",
        })
      }

      const autoFillEngine = new AutoFillEngine()
      const result = await autoFillEngine.fillRoster(
        roster._id.toString(),
        organizationId,
        types
      )

      return {
        status: 200,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          skippedCount: result.skippedCount,
          violations: result.violations,
        }
      };
    } catch (err) {
      console.error("[api/rosters/[weekId]/auto-fill POST]", err)
      return { status: 500, data: { error: "Failed to auto-fill roster" } };
    }
  }
});
