import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardLocationRoleParamsSchema,
  dashboardDateQuerySchema, 
  locationRoleStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/location/{locationId}/role/{roleId}/stats',
  summary: 'Get location-role dashboard statistics',
  description: 'Get dashboard statistics for a specific location-role combination including employee breakdown',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    params: dashboardLocationRoleParamsSchema,
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: locationRoleStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    return dashboardService.getLocationRoleStats({ ctx, locationId: params!.locationId, roleId: params!.roleId, query })
  }
})