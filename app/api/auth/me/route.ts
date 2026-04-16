import { meResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { authService } from "@/lib/services/auth/auth-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/auth/me',
  summary: 'Get current user',
  description: 'Get current authenticated user information',
  tags: ['Auth'],
  security: 'adminAuth',
  responses: {
    200: meResponseSchema,
    401: errorResponseSchema
  },
  handler: async () => {
    try {
      return await authService.me()
    } catch {
      return {
        status: 401,
        data: { error: "Authentication failed" }
      };
    }
  }
});
