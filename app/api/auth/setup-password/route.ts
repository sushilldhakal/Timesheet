/**
 * Setup Password API
 * 
 * Handles initial password setup for new employees
 * Used when admin creates employee without setting password
 */

import { setupPasswordSchema, setupTokenVerificationResponseSchema, setupPasswordResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { passwordService } from "@/lib/services/auth/password-service"

// GET - Verify setup token
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/auth/setup-password',
  summary: 'Verify setup token',
  description: 'Verify password setup token validity for new employees',
  tags: ['Auth'],
  security: 'none',
  request: {
    query: z.object({
      token: z.string().min(1, "Token is required")
    })
  },
  responses: {
    200: setupTokenVerificationResponseSchema,
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
      return await passwordService.setupPasswordVerify(token);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/setup-password GET]", err);
      }
      return {
        status: 500,
        data: { error: "Failed to verify token" }
      };
    }
  }
});

// POST - Set initial password
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/setup-password',
  summary: 'Setup password',
  description: 'Set initial password for new employee using setup token',
  tags: ['Auth'],
  security: 'none',
  request: {
    body: setupPasswordSchema
  },
  responses: {
    200: setupPasswordResponseSchema,
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
      return await passwordService.setupPassword(token, newPassword);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/setup-password POST]", err);
      }
      return {
        status: 500,
        data: { error: "Failed to set password" }
      };
    }
  }
});
