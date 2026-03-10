import { clearAuthCookie } from "@/lib/auth/auth-helpers"
import { successResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/logout',
  summary: 'User logout',
  description: 'Clear authentication cookie and log out user',
  tags: ['Auth'],
  security: 'adminAuth',
  responses: {
    200: successResponseSchema
  },
  handler: async () => {
    await clearAuthCookie();
    return {
      status: 200,
      data: { message: "Logged out successfully" }
    };
  }
});
