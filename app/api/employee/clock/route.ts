import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { clockRequestSchema, clockResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { employeeClockService } from "@/lib/services/employee/employee-clock-service"

/** POST /api/employee/clock - Clock in/out/break. Requires employee session. */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/clock',
  summary: 'Employee clock in/out',
  description: 'Record employee clock in, out, break start, or break end with location and photo validation',
  tags: ['Clock'],
  security: 'employeeAuth',
  request: {
    body: clockRequestSchema
  },
  responses: {
    200: clockResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, req }) => {
    const auth = await getEmployeeFromCookie();
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    const headerDeviceId = req.headers.get("x-device-id") || ""
    const data = await employeeClockService.clock({ authSub: auth.sub, body, headerDeviceId })
    return { status: 200, data }
  }
});
