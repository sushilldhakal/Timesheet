import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardStatsQuerySchema, 
  dashboardStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { apiErrors } from "@/lib/api/api-error"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/stats',
  summary: 'Get dashboard statistics',
  description: 'Get comprehensive dashboard statistics including timeline, location distribution, attendance, and trends',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    query: dashboardStatsQuerySchema,
  },
  responses: {
    200: dashboardStatsResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    const data = await dashboardService.getStats(ctx, query)
    return { status: 200, data }
  }
})