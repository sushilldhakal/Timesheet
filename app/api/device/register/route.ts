import { createApiRoute } from "@/lib/api/create-api-route"
import { deviceRegisterSchema, deviceRegisterResponseSchema } from "@/lib/validations/device-register"
import { errorResponseSchema } from "@/lib/validations/auth"
import { deviceRegisterService } from "@/lib/services/device/device-register-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/device/register',
  summary: 'Register device',
  description: 'Register a new device with admin credentials and location information',
  tags: ['Devices'],
  security: 'none',
  request: {
    body: deviceRegisterSchema
  },
  responses: {
    200: deviceRegisterResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      const result = await deviceRegisterService.register(body)
      return { status: 200, data: result }
    } catch (err) {
      // createApiRoute + ApiError will handle known errors; keep generic fallback as-is
      if (process.env.NODE_ENV === "development") console.error("[device/register]", err)
      return { status: 500, data: { error: "Registration failed" } }
    }
  }
});
