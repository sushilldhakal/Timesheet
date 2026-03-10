/**
 * Change Password API
 * 
 * Allows logged-in users to change their password
 * Works for both admins and employees
 */

import { connectDB, User, Employee } from "@/lib/db"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { getEmployeeFromWebCookie } from "@/lib/auth/employee-auth"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generatePasswordChangedEmail } from "@/lib/mail/templates/password-changed-confirmation"
import { changePasswordSchema, successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

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
      
      const { currentPassword, newPassword } = body;

      // Check if user is authenticated
      const adminAuth = await getAuthFromCookie();
      const employeeAuth = await getEmployeeFromWebCookie();

      if (!adminAuth && !employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        };
      }

      await connectDB();

      // Handle admin password change
      if (adminAuth) {
        const user = await User.findById(adminAuth.sub).select("+password");

        if (!user) {
          return {
            status: 404,
            data: { error: "User not found" }
          };
        }

        // Verify current password
        const bcrypt = await import("bcrypt");
        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
          return {
            status: 400,
            data: { error: "Current password is incorrect" }
          };
        }

        // Update password
        user.password = newPassword; // Will be hashed by pre-save hook
        await user.save();

        // Send confirmation email
        if (user.email) {
          try {
            const emailContent = generatePasswordChangedEmail({
              name: user.name || "Admin",
              email: user.email,
              changedAt: new Date().toLocaleString("en-US", {
                dateStyle: "long",
                timeStyle: "short",
              }),
            });

            await sendEmail({
              to: user.email,
              subject: emailContent.subject,
              html: emailContent.html,
              plain: emailContent.plain,
            });
          } catch (emailError) {
            console.error("[Change Password] Failed to send confirmation email:", emailError);
          }
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[Change Password] Password changed for user: ${user.email || user.username}`);
        }

        return {
          status: 200,
          data: { message: "Password changed successfully" }
        };
      }

      // Handle employee password change
      if (employeeAuth) {
        const employee = await Employee.findById(employeeAuth.sub).select("+password");

        if (!employee) {
          return {
            status: 404,
            data: { error: "Employee not found" }
          };
        }

        // Verify current password
        const bcrypt = await import("bcrypt");
        const isValid = employee.password 
          ? await bcrypt.compare(currentPassword, employee.password)
          : false;

        if (!isValid) {
          return {
            status: 400,
            data: { error: "Current password is incorrect" }
          };
        }

        // Update password
        employee.password = newPassword; // Will be hashed by pre-save hook
        employee.passwordChangedAt = new Date();
        employee.requirePasswordChange = false; // Clear force change flag
        await employee.save();

        // Send confirmation email
        if (employee.email) {
          try {
            const emailContent = generatePasswordChangedEmail({
              name: employee.name,
              email: employee.email,
              changedAt: new Date().toLocaleString("en-US", {
                dateStyle: "long",
                timeStyle: "short",
              }),
            });

            await sendEmail({
              to: employee.email,
              subject: emailContent.subject,
              html: emailContent.html,
              plain: emailContent.plain,
            });
          } catch (emailError) {
            console.error("[Change Password] Failed to send confirmation email:", emailError);
          }
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[Change Password] Password changed for employee: ${employee.email}`);
        }

        return {
          status: 200,
          data: { message: "Password changed successfully" }
        };
      }

      return {
        status: 401,
        data: { error: "Authentication error" }
      };
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
