import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  weekIdParamSchema,
  gapsQuerySchema,
  gapResponseSchema
} from "@/lib/validations/roster-operations"
import { errorResponseSchema } from "@/lib/validations/auth"
import { apiErrors } from "@/lib/api/api-error"
import { rosterService } from "@/lib/services/roster/roster-service"

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
    if (!ctx) throw apiErrors.unauthorized()
    if (!params) throw apiErrors.badRequest("Week ID is required")

    const { weekId } = params!;
    const organizationId = query?.organizationId;
    const includeSuggestions = query?.includeSuggestions === "true";

    const data = await rosterService.detectGaps({ weekId, organizationId, includeSuggestions })
    return { status: 200, data }
  }
});
