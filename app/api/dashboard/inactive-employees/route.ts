import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  inactiveEmployeesResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import { dashboardService } from "@/lib/services/dashboard/dashboard-service"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"

/** GET /api/dashboard/inactive-employees - Employees with no punch in the last 100 days */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/inactive-employees',
  summary: 'Get inactive employees',
  description: 'Get employees with no punch in the last 100 days',
  tags: ['Dashboard'],
  security: 'adminAuth',
  responses: {
    200: inactiveEmployeesResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const result = await dashboardService.getInactiveEmployees(ctx)
    return { status: 200, data: result }
  }
})
