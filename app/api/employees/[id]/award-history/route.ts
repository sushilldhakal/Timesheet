import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthFromCookie, getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { 
  employeeIdParamSchema,
  awardHistoryQuerySchema,
  awardHistoryResponseSchema
} from "@/lib/validations/employee-award"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeAwardService } from "@/lib/services/employee/employee-award-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/award-history',
  summary: 'Get employee award history',
  description: 'Get award assignment history for an employee with optional date filtering',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: awardHistoryQuerySchema
  },
  responses: {
    200: awardHistoryResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    const { id } = params;
    const adminAuth = await getAuthFromCookie()
    const employeeAuth = adminAuth ? null : await getEmployeeFromCookie()

    try {
      return await employeeAwardService.getAwardHistory({
        id,
        startDate: query?.startDate,
        endDate: query?.endDate,
        adminAuth,
        employeeAuth,
      })
    } catch (error: any) {
      console.error("Error fetching award history:", error);
      return { 
        status: 500, 
        data: { error: "Failed to fetch award history", details: error.message } 
      };
    }
  }
});
