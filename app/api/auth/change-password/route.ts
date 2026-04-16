/**
 * Change Password API
 * 
 * Allows logged-in users to change their password
 * Works for both admins and employees
 */

import { changePasswordSchema, successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { passwordService } from "@/lib/services/auth/password-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/change-password',
  summary: 'Change password',
  description: 'Change password for authenticated admin or employee user. Supports both admin authentication (admin_token cookie) and employee authentication (employee_token cookie).',
  tags: ['Auth'],
  security: 'none', // Handles both adminAuth and employeeAuth internally
  request: {
    body: changePasswordSchema
  },
  responses: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
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
      return await passwordService.changePassword(body)
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/change-password]", err);
      }
      return {
        status: 500,
        data: { error: "Failed to change password" }
      };
    }
  }
});
