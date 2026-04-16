import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope } from "@/lib/auth/scheduling-scope"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  weekIdParamSchema,
  autoFillRequestSchema,
  autoFillResponseSchema,
} from "@/lib/validations/roster-operations"
import { errorResponseSchema } from "@/lib/validations/auth"
import { rosterService } from "@/lib/services/roster/roster-service"

export const POST = createApiRoute({
  method: "POST",
  path: "/api/rosters/{weekId}/auto-fill",
  summary: "Auto-fill roster",
  description: "Auto-fill roster with shifts for a location and managed roles",
  tags: ["Rosters"],
  security: "adminAuth",
  request: {
    params: weekIdParamSchema,
    body: autoFillRequestSchema,
  },
  responses: {
    200: autoFillResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!params || !body) {
      return { status: 400, data: { error: "Week ID and request body are required" } }
    }

    const { weekId } = params
    const { locationId, managedRoles, employmentTypes, replaceDrafts } = body

    const scope = await assertManagerSchedulingScope(ctx, locationId, managedRoles)
    if (!scope.ok) {
      return { status: scope.status, data: { error: scope.error } }
    }

    const types = employmentTypes || ["FULL_TIME", "PART_TIME"]

    try {
      return await rosterService.autoFillRoster(weekId, locationId, managedRoles, employmentTypes, replaceDrafts)
    } catch (err) {
      console.error("[api/rosters/[weekId]/auto-fill POST]", err)
      return { status: 500, data: { error: "Failed to auto-fill roster" } }
    }
  },
})
