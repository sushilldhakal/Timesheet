/**
 * Forgot Password API
 * 
 * Handles password reset requests for both admins and employees
 * Sends email with reset link
 */

import { forgotPasswordSchema, successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { forgotPasswordService } from "@/lib/services/auth/forgot-password-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/forgot-password',
  summary: 'Forgot password',
  description: 'Send password reset email to user',
  tags: ['Auth'],
  security: 'none',
  request: {
    body: forgotPasswordSchema
  },
  responses: {
    200: successResponseSchema,
    400: errorResponseSchema,
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
      
      const { email } = body;
      return await forgotPasswordService.requestReset(email)
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/forgot-password]", err);
      }
      return {
        status: 500,
        data: { error: "Failed to process request" }
      };
    }
  }
});
