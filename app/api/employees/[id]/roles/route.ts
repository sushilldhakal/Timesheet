import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager, RoleAssignmentError } from "@/lib/managers/role-assignment-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { Employee } from "@/lib/db/schemas/employee"
import { formatSuccess, formatError } from "@/lib/utils/api/api-response"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  roleAssignmentQuerySchema,
  roleAssignmentCreateSchema,
  roleAssignmentsListResponseSchema,
  roleAssignmentCreateResponseSchema
} from "@/lib/validations/employee-roles"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/roles',
  summary: 'Get employee role assignments',
  description: 'Get all role assignments for an employee with optional filtering',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: roleAssignmentQuerySchema
  },
  responses: {
    200: roleAssignmentsListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: formatError("Unauthorized", "AUTH_REQUIRED") };
    }

    if (!params) {
      return { status: 400, data: formatError("Employee ID is required", "INVALID_EMPLOYEE_ID") };
    }

    const { id: employeeId } = params;
    const locationId = query?.locationId;
    const dateParam = query?.date;
    const includeInactive = query?.includeInactive === "true";

    // Validate employeeId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return { status: 400, data: formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID") };
    }

    // Validate locationId if provided
    if (locationId && !mongoose.Types.ObjectId.isValid(locationId)) {
      return { status: 400, data: formatError("Invalid location ID", "INVALID_LOCATION_ID") };
    }

    try {
      await connectDB()

      // Verify employee exists
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return { status: 404, data: formatError("Employee not found", "EMPLOYEE_NOT_FOUND") };
      }

      const date = dateParam ? new Date(dateParam) : new Date()
      
      // Validate date
      if (isNaN(date.getTime())) {
        return { status: 400, data: formatError("Invalid date parameter", "INVALID_DATE") };
      }

      const manager = new RoleAssignmentManager()

      // Get employee's role assignments
      const assignments = await manager.getEmployeeAssignments(
        employeeId,
        locationId || undefined,
        date,
        includeInactive
      )

      // Format response
      const formattedAssignments = assignments.map((assignment: any) => {
        const roleData = assignment.roleId as any
        const locationData = assignment.locationId as any

        return {
          id: assignment._id.toString(),
          roleId: roleData._id.toString(),
          roleName: roleData.name,
          roleColor: roleData.color,
          locationId: locationData._id.toString(),
          locationName: locationData.name,
          locationColor: locationData.color,
          validFrom: assignment.validFrom,
          validTo: assignment.validTo,
          isActive: assignment.isActive,
          notes: assignment.notes,
          assignedAt: assignment.assignedAt,
        }
      })

      return {
        status: 200,
        data: formatSuccess(
          { assignments: formattedAssignments },
          {
            count: formattedAssignments.length,
            employeeId,
            date: date.toISOString(),
          }
        )
      };
    } catch (err) {
      console.error("[api/employees/[id]/roles GET]", err)
      
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

      return { status: 500, data: formatError("Failed to fetch employee role assignments", "FETCH_FAILED") };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/roles',
  summary: 'Assign role to employee',
  description: 'Assign employee to a role at a location',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: roleAssignmentCreateSchema
  },
  responses: {
    201: roleAssignmentCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: formatError("Unauthorized", "AUTH_REQUIRED") };
    }

    if (!params || !body) {
      return { status: 400, data: formatError("Employee ID and request body are required", "INVALID_REQUEST") };
    }

    const { id: employeeId } = params;

    // Validate employeeId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return { status: 400, data: formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID") };
    }

    const { roleId, locationId, validFrom, validTo, notes } = body;

    try {
      await connectDB()

      const manager = new RoleAssignmentManager()
      const assignment = await manager.assignRole({
        employeeId,
        roleId,
        locationId,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: validTo ? new Date(validTo) : null,
        userId: auth.sub,
        notes,
      }) as any

      // Populate assignment details
      const populatedAssignment = await EmployeeRoleAssignment.findById(assignment._id)
        .populate("roleId", "name color type")
        .populate("locationId", "name type")

      if (!populatedAssignment) {
        return { status: 500, data: formatError("Failed to retrieve created assignment", "ASSIGNMENT_NOT_FOUND") };
      }

      const roleData = populatedAssignment.roleId as any
      const locationData = populatedAssignment.locationId as any

      return {
        status: 201,
        data: formatSuccess(
          {
            assignment: {
              id: populatedAssignment._id.toString(),
              employeeId: populatedAssignment.employeeId.toString(),
              roleId: roleData._id.toString(),
              roleName: roleData.name,
              roleColor: roleData.color,
              locationId: locationData._id.toString(),
              locationName: locationData.name,
              validFrom: populatedAssignment.validFrom,
              validTo: populatedAssignment.validTo,
              isActive: populatedAssignment.isActive,
              notes: populatedAssignment.notes,
              assignedAt: populatedAssignment.assignedAt,
            },
          },
          {
            createdAt: populatedAssignment.assignedAt?.toISOString(),
          }
        )
      };
    } catch (err: any) {
      console.error("[api/employees/[id]/roles POST]", err)
      
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

      // Handle JSON parsing errors
      if (err instanceof SyntaxError) {
        return { status: 400, data: formatError("Invalid JSON in request body", "INVALID_JSON") };
      }

      return { status: 500, data: formatError("Failed to assign role to employee", "ASSIGN_FAILED") };
    }
  }
});
