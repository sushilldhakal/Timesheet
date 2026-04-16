import { employeeLoginSchema, employeeLoginResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { logger } from "@/lib/utils/logger"
import { createApiRoute } from "@/lib/api/create-api-route"
import { employeeAuthService } from "@/lib/services/employee/employee-auth-service"

export const dynamic = "force-dynamic"

/** POST /api/employee/login - Verify PIN, create employee session. Returns employee + today's punches for clock page (no extra fetch needed). */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/login',
  summary: 'Employee PIN login',
  description: 'Authenticate employee with PIN and return session with today\'s punch data',
  tags: ['Clock'],
  security: 'none',
  request: {
    body: employeeLoginSchema
  },
  responses: {
    200: employeeLoginResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }
      return await employeeAuthService.pinLogin(body)
    } catch (err) {
      logger.error("[api/employee/login]", err);
      return {
        status: 500,
        data: { error: "Login failed" }
      };
    }
  }
});
