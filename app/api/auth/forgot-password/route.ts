/**
 * Forgot Password API
 * 
 * Handles password reset requests for both admins and employees
 * Sends email with reset link
 */

import { connectDB } from "@/lib/db"
import { findUserByEmail } from "@/lib/utils/validation/email-validator"
import { generateTokenWithExpiry } from "@/lib/utils/auth/auth-tokens"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generatePasswordResetEmail } from "@/lib/mail/templates/password-reset"
import { forgotPasswordSchema, successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

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
      await connectDB();

      // Find user in either collection
      const result = await findUserByEmail(email);

      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (result && result.user) {
        const { token, hashedToken, expiry } = generateTokenWithExpiry(24); // 24 hours

        // Update user with reset token
        if (result.type === "admin") {
          const { User } = await import("@/lib/db/schemas/user");
          await User.findByIdAndUpdate(result.user._id, {
            passwordResetToken: hashedToken,
            passwordResetExpiry: expiry,
          });
        } else if (result.type === "employee") {
          const { Employee } = await import("@/lib/db/schemas/employee");
          await Employee.findByIdAndUpdate(result.user._id, {
            passwordResetToken: hashedToken,
            passwordResetExpiry: expiry,
          });
        }

        // Send reset email
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
        
        const emailContent = generatePasswordResetEmail({
          name: result.user.name || "there",
          email,
          resetUrl,
        });

        await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          plain: emailContent.plain,
        });

        if (process.env.NODE_ENV === "development") {
          console.log(`[Forgot Password] Reset link sent to ${email}`);
          console.log(`[Forgot Password] Reset URL: ${resetUrl}`);
        }
      }

      // Always return success (security best practice)
      return {
        status: 200,
        data: {
          message: "If that email exists in our system, we've sent a password reset link."
        }
      };
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
