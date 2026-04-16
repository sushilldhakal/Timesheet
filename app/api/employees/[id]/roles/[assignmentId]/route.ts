import { formatError } from "@/lib/utils/api/api-response"
import { z } from "zod"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  roleAssignmentUpdateSchema,
  roleAssignmentUpdateResponseSchema,
  roleAssignmentDeleteResponseSchema
} from "@/lib/validations/employee-roles"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeRolesService } from "@/lib/services/employee/employee-roles-service"

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
    if (!params || !body) {
      return { status: 400, data: formatError("Employee ID, assignment ID and request body are required", "INVALID_REQUEST") };
    }

    try {
      return await employeeRolesService.updateAssignment({ employeeId: params.id, assignmentId: params.assignmentId, body })
    } catch (err) {
      console.error("[api/employees/[id]/roles/[assignmentId] PATCH]", err)
      return { status: 500, data: formatError("Failed to update assignment", "UPDATE_FAILED") }
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
    if (!params) {
      return { status: 400, data: formatError("Employee ID and assignment ID are required", "INVALID_REQUEST") };
    }

    try {
      return await employeeRolesService.endAssignment({ employeeId: params.id, assignmentId: params.assignmentId })
    } catch (err) {
      console.error("[api/employees/[id]/roles/[assignmentId] DELETE]", err)
      return { status: 500, data: formatError("Failed to end assignment", "END_ASSIGNMENT_FAILED") }
    }
  }
});
