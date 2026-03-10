import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager, RoleAssignmentError } from "@/lib/managers/role-assignment-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { formatSuccess, formatError } from "@/lib/utils/api/api-response"
import mongoose from "mongoose"
import { z } from "zod"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  roleAssignmentUpdateSchema,
  roleAssignmentUpdateResponseSchema,
  roleAssignmentDeleteResponseSchema
} from "@/lib/validations/employee-roles"
import { errorResponseSchema } from "@/lib/validations/auth"

/**
 * PATCH /api/employees/[id]/roles/[assignmentId]
 * Update role assignment (typically to set end date)
 * 
 * Request Body:
 * - validTo: string | null (ISO date, optional)
 * - notes: string (optional)
 */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/roles/{assignmentId}',
  summary: 'Update role assignment',
  description: 'Update role assignment (typically to set end date)',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: z.object({
      id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format"),
      assignmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid assignment ID format")
    }),
    body: roleAssignmentUpdateSchema
  },
  responses: {
    200: roleAssignmentUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: formatError("Unauthorized", "AUTH_REQUIRED") };
    }

    if (!params || !body) {
      return { status: 400, data: formatError("Employee ID, assignment ID and request body are required", "INVALID_REQUEST") };
    }

    const { id: employeeId, assignmentId } = params!;
    const { validTo, notes } = body!;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return { status: 400, data: formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID") };
    }

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return { status: 400, data: formatError("Invalid assignment ID", "INVALID_ASSIGNMENT_ID") };
    }

    try {
      await connectDB()

      // Find the assignment
      const assignment = await EmployeeRoleAssignment.findOne({
        _id: new mongoose.Types.ObjectId(assignmentId),
        employeeId: new mongoose.Types.ObjectId(employeeId),
      })

      if (!assignment) {
        return { status: 404, data: formatError("Assignment not found", "ASSIGNMENT_NOT_FOUND") };
      }

      // Validate validTo is after validFrom
      if (validTo !== undefined && validTo !== null) {
        const validToDate = new Date(validTo)
        if (validToDate < assignment.validFrom) {
          return { status: 400, data: formatError("Valid to date must be after or equal to valid from date", "INVALID_DATE_RANGE") };
        }
      }

      // Update fields
      if (validTo !== undefined) {
        assignment.validTo = validTo ? new Date(validTo) : null

        // Recompute isActive
        const now = new Date()
        assignment.isActive = assignment.validFrom <= now && (!assignment.validTo || assignment.validTo >= now)
      }

      if (notes !== undefined) {
        assignment.notes = notes
      }

      await assignment.save()

      // Populate assignment details
      const populatedAssignment = await EmployeeRoleAssignment.findById(assignment._id)
        .populate("roleId", "name color type")
        .populate("locationId", "name type")

      if (!populatedAssignment) {
        return { status: 500, data: formatError("Failed to retrieve updated assignment", "ASSIGNMENT_NOT_FOUND") };
      }

      const roleData = populatedAssignment.roleId as any
      const locationData = populatedAssignment.locationId as any

      return {
        status: 200,
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
            updatedAt: populatedAssignment.updatedAt?.toISOString(),
          }
        )
      };
    } catch (err: any) {
      console.error("[api/employees/[id]/roles/[assignmentId] PATCH]", err)

      // Handle RoleAssignmentError
      if (err instanceof RoleAssignmentError) {
        return { status: err.statusCode, data: formatError(err.message, err.code) };
      }

      // Handle database validation errors
      if (err.name === "ValidationError") {
        return { status: 400, data: formatError(`Validation error: ${err.message}`, "DATABASE_VALIDATION_ERROR") };
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

      return { status: 500, data: formatError("Failed to update assignment", "UPDATE_FAILED") };
    }
  }
});

/**
 * DELETE /api/employees/[id]/roles/[assignmentId]
 * Remove role assignment (sets validTo to now)
 */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}/roles/{assignmentId}',
  summary: 'Remove role assignment',
  description: 'Remove role assignment (sets validTo to now)',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: z.object({
      id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid employee ID format"),
      assignmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid assignment ID format")
    })
  },
  responses: {
    200: roleAssignmentDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
    503: errorResponseSchema
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: formatError("Unauthorized", "AUTH_REQUIRED") };
    }

    if (!params) {
      return { status: 400, data: formatError("Employee ID and assignment ID are required", "INVALID_REQUEST") };
    }

    const { id: employeeId, assignmentId } = params!;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return { status: 400, data: formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID") };
    }

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return { status: 400, data: formatError("Invalid assignment ID", "INVALID_ASSIGNMENT_ID") };
    }

    try {
      await connectDB()

      const manager = new RoleAssignmentManager()
      await manager.endAssignment(assignmentId, auth.sub)

      return {
        status: 200,
        data: formatSuccess(
          { message: "Assignment ended successfully" },
          {
            employeeId,
            assignmentId,
            endedAt: new Date().toISOString(),
          }
        )
      };
    } catch (err: any) {
      console.error("[api/employees/[id]/roles/[assignmentId] DELETE]", err)

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

      return { status: 500, data: formatError("Failed to end assignment", "END_ASSIGNMENT_FAILED") };
    }
  }
});
