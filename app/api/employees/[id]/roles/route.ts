import { formatError } from "@/lib/utils/api/api-response"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  roleAssignmentQuerySchema,
  roleAssignmentCreateSchema,
  roleAssignmentsListResponseSchema,
  roleAssignmentCreateResponseSchema
} from "@/lib/validations/employee-roles"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeRolesService } from "@/lib/services/employee/employee-roles-service"

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
    if (!params) {
      return { status: 400, data: formatError("Employee ID is required", "INVALID_EMPLOYEE_ID") };
    }

    try {
      return await employeeRolesService.listAssignments({ employeeId: params.id, query })
    } catch (err) {
      console.error("[api/employees/[id]/roles GET]", err)
      return { status: 500, data: formatError("Failed to fetch employee role assignments", "FETCH_FAILED") }
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
    if (!params || !body) {
      return { status: 400, data: formatError("Employee ID and request body are required", "INVALID_REQUEST") };
    }

    try {
      return await employeeRolesService.assignRole({ employeeId: params.id, body })
    } catch (err: any) {
      console.error("[api/employees/[id]/roles POST]", err)
      return { status: 500, data: formatError("Failed to assign role to employee", "ASSIGN_FAILED") }
    }
  }
});
