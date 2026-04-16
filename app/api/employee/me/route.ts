import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { employeeMeResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { employeeAuthService } from "@/lib/services/employee/employee-auth-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employee/me',
  summary: 'Get current employee',
  description: 'Get current authenticated employee information',
  tags: ['Clock'],
  security: 'employeeAuth',
  responses: {
    200: employeeMeResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    try {
      const employeeAuth = await getEmployeeFromCookie()

      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        };
      }
      return await employeeAuthService.me(employeeAuth.sub)
    } catch (err) {
      console.error("[api/employee/me]", err);
      return {
        status: 500,
        data: { error: "Failed to fetch employee" }
      };
    }
  }
});
