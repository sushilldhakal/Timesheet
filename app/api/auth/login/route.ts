import { authService } from "@/lib/services/auth/auth-service"
import { loginSchema, loginResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/login',
  summary: 'User login',
  description: 'Authenticate user with email and password',
  tags: ['Auth'],
  security: 'none',
  request: {
    body: loginSchema
  },
  responses: {
    200: loginResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    try {
      const { body } = data;
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }
      return await authService.login(body)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[auth/login]", err);
      }
      return {
        status: 500,
        data: { error: "Login failed" }
      };
    }
  }
});
