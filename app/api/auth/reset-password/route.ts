/**
 * Reset Password API
 * 
 * Handles password reset with token verification
 * Works for both admins and employees
 */

import { resetPasswordSchema, tokenVerificationResponseSchema, resetPasswordResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { passwordService } from "@/lib/services/auth/password-service"

// GET - Verify reset token
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/auth/reset-password',
  summary: 'Verify reset token',
  description: 'Verify password reset token validity',
  tags: ['Auth'],
  security: 'none',
  request: {
    query: z.object({
      token: z.string().min(1, "Token is required")
    })
  },
  responses: {
    200: tokenVerificationResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ query }) => {
    try {
      if (!query) {
        return {
          status: 400,
          data: { error: "Query parameters are required" }
        };
      }
      const { token } = query;
      return await passwordService.resetPasswordVerify(token);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/reset-password GET]", err);
      }
      return {
        status: 500,
        data: { error: "Failed to verify token" }
      };
    }
  }
});

// POST - Reset password
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/reset-password',
  summary: 'Reset password',
  description: 'Reset password using valid token',
  tags: ['Auth'],
  security: 'none',
  request: {
    body: resetPasswordSchema
  },
  responses: {
    200: resetPasswordResponseSchema,
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
      const { token, newPassword } = body;
      return await passwordService.resetPassword(token, newPassword);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/reset-password POST]", err);
      }
      return {
        status: 500,
        data: { error: "Failed to reset password" }
      };
    }
  }
});
