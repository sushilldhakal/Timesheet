import { connectDB, Employee } from "@/lib/db"
import { getEmployeeFromWebCookie } from "@/lib/auth/employee-auth"
import { changeEmployeePasswordSchema } from "@/lib/validations/employee-clock"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/change-password',
  summary: 'Change employee password',
  description: 'Allow authenticated employee to change their password',
  tags: ['Clock'],
  security: 'employeeAuth',
  request: {
    body: changeEmployeePasswordSchema
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
      const employeeAuth = await getEmployeeFromWebCookie();

      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        };
      }

      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      const { currentPassword, newPassword } = body;

      await connectDB();

      const employee = await Employee.findById(employeeAuth.sub)
        .select("+password");

      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }

      // Verify current password
      if (employee.password) {
        const isCurrentPasswordValid = await employee.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          return {
            status: 400,
            data: { error: "Current password is incorrect" }
          };
        }
      }

      // Update password
      employee.password = newPassword;
      employee.requirePasswordChange = false;
      employee.passwordSetByAdmin = false;
      employee.passwordChangedAt = new Date();
      
      await employee.save();

      return {
        status: 200,
        data: { message: "Password changed successfully" }
      };
    } catch (err) {
      console.error("[api/employee/change-password]", err);
      return {
        status: 500,
        data: { error: "Failed to change password" }
      };
    }
  }
});