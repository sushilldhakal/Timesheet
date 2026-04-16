import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  hoursSummaryQuerySchema, 
  hoursSummaryResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"

/** GET /api/dashboard/hours-summary?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
 *  Returns most hours (top staff, overtime) and least hours (< 38h, min first). */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/hours-summary',
  summary: 'Get hours summary dashboard',
  description: 'Returns most hours (top staff, overtime) and least hours (< 38h, min first) for a date range',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    query: hoursSummaryQuerySchema,
  },
  responses: {
    200: hoursSummaryResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    const result = await dashboardService.getHoursSummary(ctx, query)
    return { status: 200, data: result }
  }
})
