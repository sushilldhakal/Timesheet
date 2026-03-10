import { clearEmployeeWebCookie } from "@/lib/auth/employee-auth"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/logout',
  summary: 'Employee logout',
  description: 'Clear employee web session cookie and log out',
  tags: ['Clock'],
  security: 'employeeAuth',
  responses: {
    200: successResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    try {
      await clearEmployeeWebCookie();

      return {
        status: 200,
        data: { message: "Logged out successfully" }
      };
    } catch (err) {
      console.error("[api/employee/logout]", err);
      return {
        status: 500,
        data: { error: "Logout failed" }
      };
    }
  }
});
