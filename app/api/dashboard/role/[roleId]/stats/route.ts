import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardRoleIdParamSchema,
  dashboardDateQuerySchema, 
  roleStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/role/{roleId}/stats',
  summary: 'Get role dashboard statistics',
  description: 'Get dashboard statistics for a specific role including location distribution and metrics',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    params: dashboardRoleIdParamSchema,
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: roleStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    return dashboardService.getRoleStats({ ctx, roleId: params!.roleId, query })
  }
})