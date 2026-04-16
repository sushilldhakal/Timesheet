import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  pinCheckQuerySchema,
  pinCheckResponseSchema
} from "@/lib/validations/employee-pin"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePinService } from "@/lib/services/employee/employee-pin-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/check-pin',
  summary: 'Check PIN availability',
  description: 'Check if a PIN is available for use',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    query: pinCheckQuerySchema
  },
  responses: {
    200: pinCheckResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!query) {
      return { status: 400, data: { error: "PIN parameter is required" } };
    }

    const { pin } = query!;

    if (!pin || pin.length < 4) {
      return { status: 400, data: { error: "Invalid PIN" } };
    }

    try {
      return await employeePinService.checkAvailability(pin)
    } catch (err) {
      console.error("[api/employees/check-pin]", err)
      return { status: 500, data: { error: "Failed to check PIN" } };
    }
  }
});
