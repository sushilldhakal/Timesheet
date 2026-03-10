import { connectDB, Employee } from "@/lib/db"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { employeeMeResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employee/me',
  summary: 'Get current employee',
  description: 'Get current authenticated employee information',
  tags: ['Clock'],
  security: 'employeeAuth',
  responses: {
    200: employeeMeResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    try {
      const employeeAuth = await getEmployeeFromCookie();

      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        };
      }

      await connectDB();

      const employee = await Employee.findById(employeeAuth.sub)
        .select("-password -passwordSetupToken -passwordResetToken")
        .lean();

      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }

      const locations = Array.isArray(employee.location) ? employee.location : [];
      const employers = Array.isArray(employee.employer) ? employee.employer : [];

      return {
        status: 200,
        data: {
          employee: {
            pin: employee.pin,
            id: String(employee._id),
            name: employee.name,
            location: locations[0] || "",
            employer: employers[0] || "",
            email: employee.email,
            phone: employee.phone,
            homeAddress: employee.homeAddress,
            employmentType: employee.employmentType || undefined,
            img: employee.img,
          },
        }
      };
    } catch (err) {
      console.error("[api/employee/me]", err);
      return {
        status: 500,
        data: { error: "Failed to fetch employee" }
      };
    }
  }
});
