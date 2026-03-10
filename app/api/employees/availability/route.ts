import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager, RoleAssignmentError } from "@/lib/managers/role-assignment-manager"
import { formatSuccess, formatError } from "@/lib/utils/api/api-response"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeAvailabilityQuerySchema,
  employeeAvailabilityResponseSchema
} from "@/lib/validations/employee-availability"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/availability',
  summary: 'Get available employees for role',
  description: 'Get available employees for a role at a location on a specific date',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    query: employeeAvailabilityQuerySchema
  },
  responses: {
    200: employeeAvailabilityResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema
  },
  handler: async ({ query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: formatError("Unauthorized", "AUTH_REQUIRED") };
    }

    if (!query) {
      return { status: 400, data: formatError("Query parameters are required", "MISSING_QUERY") };
    }

    const { roleId, locationId, date: dateParam } = query!;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return { status: 400, data: formatError("Invalid role ID format", "INVALID_ROLE_ID") };
    }

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return { status: 400, data: formatError("Invalid location ID format", "INVALID_LOCATION_ID") };
    }

    const date = dateParam ? new Date(dateParam) : new Date()

    // Validate date
    if (isNaN(date.getTime())) {
      return { status: 400, data: formatError("Invalid date parameter", "INVALID_DATE") };
    }

    try {
      await connectDB()

      const manager = new RoleAssignmentManager()

      // Get employees assigned to this role at this location
      const assignments = await manager.getEmployeesForRole(roleId, locationId, date)

      // Transform assignments to employee availability format
      const employees = assignments.map((assignment: any) => {
        const employeeData = assignment.employeeId

        return {
          employeeId: employeeData._id.toString(),
          employeeName: employeeData.name,
          assignmentId: assignment._id.toString(),
          validFrom: assignment.validFrom.toISOString(),
          validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
        }
      })

      return {
        status: 200,
        data: formatSuccess(
          { employees },
          {
            count: employees.length,
            roleId,
            locationId,
            date: date.toISOString(),
          }
        )
      };
    } catch (err) {
      console.error("[api/employees/availability GET]", err)

      // Handle RoleAssignmentError
      if (err instanceof RoleAssignmentError) {
        return { status: err.statusCode, data: formatError(err.message, err.code) };
      }

      // Handle database connection errors
      if (err instanceof Error && (err.message?.includes("connection") || err.message?.includes("timeout"))) {
        return {
          status: 503,
          data: formatError("Database connection error. Please try again later.", "DATABASE_CONNECTION_ERROR")
        };
      }

      return { status: 500, data: formatError("Failed to fetch available employees", "FETCH_FAILED") };
    }
  }
});
