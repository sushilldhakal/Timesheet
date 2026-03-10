/**
 * Reset Password API
 * 
 * Handles password reset with token verification
 * Works for both admins and employees
 */

import { connectDB, User, Employee } from "@/lib/db"
import { hashToken, isTokenValid } from "@/lib/utils/auth/auth-tokens"
import { resetPasswordSchema, tokenVerificationResponseSchema, resetPasswordResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

      await connectDB();
      const hashedToken = hashToken(token);

      // Check users collection
      const user = await User.findOne({
        passwordResetToken: hashedToken,
      })
        .select("+passwordResetToken +passwordResetExpiry")
        .lean();

      if (user && isTokenValid(user.passwordResetExpiry)) {
        return {
          status: 200,
          data: {
            valid: true,
            email: user.email || user.username,
            name: user.name,
            type: "admin" as const,
          }
        };
      }

      // Check employees collection
      const employee = await Employee.findOne({
        passwordResetToken: hashedToken,
      })
        .select("+passwordResetToken +passwordResetExpiry")
        .lean();

      if (employee && isTokenValid(employee.passwordResetExpiry)) {
        return {
          status: 200,
          data: {
            valid: true,
            email: employee.email,
            name: employee.name,
            type: "employee" as const,
          }
        };
      }

      return {
        status: 400,
        data: { error: "Invalid or expired token" }
      };
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
      await connectDB();
      const hashedToken = hashToken(token);

      // Check users collection
      const user = await User.findOne({
        passwordResetToken: hashedToken,
      }).select("+passwordResetToken +passwordResetExpiry");

      if (user && isTokenValid(user.passwordResetExpiry)) {
        // Update password and clear reset token
        user.password = newPassword; // Will be hashed by pre-save hook
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save();

        if (process.env.NODE_ENV === "development") {
          console.log(`[Reset Password] Password reset for user: ${user.email || user.username}`);
        }

        return {
          status: 200,
          data: {
            message: "Password reset successfully",
            userType: "admin" as const,
          }
        };
      }

      // Check employees collection
      const employee = await Employee.findOne({
        passwordResetToken: hashedToken,
      }).select("+passwordResetToken +passwordResetExpiry");

      if (employee && isTokenValid(employee.passwordResetExpiry)) {
        // Update password and clear reset token
        employee.password = newPassword; // Will be hashed by pre-save hook
        employee.passwordResetToken = null;
        employee.passwordResetExpiry = null;
        employee.passwordChangedAt = new Date();
        employee.requirePasswordChange = false; // Clear force change flag
        await employee.save();

        if (process.env.NODE_ENV === "development") {
          console.log(`[Reset Password] Password reset for employee: ${employee.email}`);
        }

        return {
          status: 200,
          data: {
            message: "Password reset successfully",
            userType: "employee" as const,
          }
        };
      }

      return {
        status: 400,
        data: { error: "Invalid or expired token" }
      };
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
