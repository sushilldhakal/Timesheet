import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { pinGenerationResponseSchema } from "@/lib/validations/employee-pin"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePinGenerationService } from "@/lib/services/employee/employee-pin-generation-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/generate-pin',
  summary: 'Generate unique PIN',
  description: 'Returns a unique random 4-digit PIN for clock-in',
  tags: ['Employees'],
  security: 'adminAuth',
  responses: {
    200: pinGenerationResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    try {
      return await employeePinGenerationService.generateUniquePin()
    } catch (err) {
      console.error("[api/employees/generate-pin]", err)
      return { status: 500, data: { error: "Failed to generate PIN" } };
    }
  }
});
