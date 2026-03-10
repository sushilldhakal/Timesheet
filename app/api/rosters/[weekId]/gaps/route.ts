import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Roster } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { GapIdentifier } from "@/lib/managers/gap-identifier"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  weekIdParamSchema,
  gapsQuerySchema,
  gapResponseSchema
} from "@/lib/validations/roster-operations"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/rosters/{weekId}/gaps',
  summary: 'Detect roster gaps',
  description: 'Detect staffing gaps in a roster',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
    query: gapsQuerySchema
  },
  responses: {
    200: gapResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params) {
      return { status: 400, data: { error: "Week ID is required" } };
    }

    const { weekId } = params!;
    const organizationId = query?.organizationId;
    const includeSuggestions = query?.includeSuggestions === "true";

    // Validate weekId format
    if (!/^\d{4}-W\d{2}$/.test(weekId)) {
      return { status: 400, data: { error: "Invalid week ID format (expected YYYY-Www)" } };
    }

    try {
      await connectDB()

      // Use enhanced gap identifier if organizationId is provided
      if (organizationId && includeSuggestions) {
        const roster = await Roster.findOne({ weekId })
        if (!roster) {
          return { status: 404, data: { error: "Roster not found" } };
        }

        const gapIdentifier = new GapIdentifier()
        const gaps = await gapIdentifier.identifyGaps(
          roster._id.toString(),
          organizationId
        )

        return { status: 200, data: { gaps } };
      }

      // Fall back to existing roster manager
      const rosterManager = new RosterManager()
      const result = await rosterManager.detectGaps(weekId)

      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return { status: 404, data: { error: result.error, message: result.message } };
        }
        return { status: 500, data: { error: result.error, message: result.message } };
      }

      return { status: 200, data: { gaps: result.gaps } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/gaps GET]", err)
      return { status: 500, data: { error: "Failed to detect gaps" } };
    }
  }
});
