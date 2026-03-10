/**
 * Setup Password API
 * 
 * Handles initial password setup for new employees
 * Used when admin creates employee without setting password
 */

import { connectDB, Employee } from "@/lib/db"
import { hashToken, isTokenValid } from "@/lib/utils/auth/auth-tokens"
import { setupPasswordSchema, setupTokenVerificationResponseSchema, setupPasswordResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

      await connectDB();
      const hashedToken = hashToken(token);

      // Find employee with setup token
      const employee = await Employee.findOne({
        passwordSetupToken: hashedToken,
      })
        .select("+passwordSetupToken +passwordSetupExpiry")
        .lean();

      if (!employee) {
        return {
          status: 400,
          data: { error: "Invalid token" }
        };
      }

      if (!isTokenValid(employee.passwordSetupExpiry)) {
        return {
          status: 400,
          data: { error: "Token has expired" }
        };
      }

      return {
        status: 200,
        data: {
          valid: true,
          email: employee.email,
          name: employee.name,
          pin: employee.pin,
        }
      };
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
      await connectDB();
      const hashedToken = hashToken(token);

      // Find employee with setup token
      const employee = await Employee.findOne({
        passwordSetupToken: hashedToken,
      }).select("+passwordSetupToken +passwordSetupExpiry");

      if (!employee) {
        return {
          status: 400,
          data: { error: "Invalid token" }
        };
      }

      if (!isTokenValid(employee.passwordSetupExpiry)) {
        return {
          status: 400,
          data: { error: "Token has expired" }
        };
      }

      // Set password and clear setup token
      employee.password = newPassword; // Will be hashed by pre-save hook
      employee.passwordSetupToken = null;
      employee.passwordSetupExpiry = null;
      employee.passwordChangedAt = new Date();
      employee.requirePasswordChange = false;
      await employee.save();

      if (process.env.NODE_ENV === "development") {
        console.log(`[Setup Password] Password set for employee: ${employee.email}`);
      }

      // Auto-login after setup
      const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/employee-auth");
      
      const authToken = await createEmployeeWebToken({
        sub: String(employee._id),
        pin: employee.pin,
      });

      await setEmployeeWebCookie(authToken);

      return {
        status: 200,
        data: {
          message: "Password set successfully",
          redirect: "/staff/dashboard",
        }
      };
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
