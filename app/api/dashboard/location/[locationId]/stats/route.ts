import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardLocationIdParamSchema,
  dashboardDateQuerySchema, 
  locationStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/location/{locationId}/stats',
  summary: 'Get location dashboard statistics',
  description: 'Get dashboard statistics for a specific location including role distribution and metrics',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    params: dashboardLocationIdParamSchema,
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: locationStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    return dashboardService.getLocationStats({ ctx, locationId: params!.locationId, query })
  }
})