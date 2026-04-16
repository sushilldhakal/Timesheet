import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { formatError } from "@/lib/utils/api/api-response"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeAvailabilityQuerySchema,
  employeeAvailabilityResponseSchema
} from "@/lib/validations/employee-availability"
import { errorResponseSchema } from "@/lib/validations/auth"
import { availabilityService } from "@/lib/services/availability/availability-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/availability',
  summary: 'Get available employees for role',
  description: 'Get available employees for a role at a location on a specific date',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    query: employeeAvailabilityQuerySchema
  },
  responses: {
    200: employeeAvailabilityResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema
  },
  handler: async ({ query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: formatError("Unauthorized", "AUTH_REQUIRED") };
    }

    if (!query) {
      return { status: 400, data: formatError("Query parameters are required", "MISSING_QUERY") };
    }

    return await availabilityService.getAvailableEmployeesForRole({ query })
  }
});
