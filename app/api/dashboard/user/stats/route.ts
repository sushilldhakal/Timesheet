import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardDateQuerySchema, 
  userStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/user/stats',
  summary: 'Get user dashboard statistics',
  description: 'Get dashboard statistics for the current user including managed locations and roles',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: userStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    return dashboardService.getUserStats({ ctx, query })
  }
})