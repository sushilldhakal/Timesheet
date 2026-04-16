import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  timesheetQuerySchema,
  timesheetUpdateSchema,
  timesheetListResponseSchema,
  timesheetUpdateResponseSchema
} from "@/lib/validations/employee-timesheet"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeTimesheetService } from "@/lib/services/employee/employee-timesheet-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/timesheet',
  summary: 'Get employee timesheet',
  description: "Get employee's daily timesheet with pagination and filtering",
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: timesheetQuerySchema
  },
  responses: {
    200: timesheetListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    if (!params) return { status: 400, data: { error: "Employee ID is required" } };
    const result = await employeeTimesheetService.getEmployeeTimesheet({ employeeId: params.id, query })
    return { status: 200, data: result }
  }
});

/** PATCH /api/employees/[id]/timesheet - Update a timesheet entry */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/timesheet',
  summary: 'Update employee timesheet',
  description: 'Update a timesheet entry for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: timesheetUpdateSchema
  },
  responses: {
    200: timesheetUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!params || !body) {
      return { status: 400, data: { error: "Employee ID and request body are required" } };
    }
    const result = await employeeTimesheetService.updateTimesheetEntry({ employeeId: params.id, body, ctx })
    return { status: 200, data: result }
  }
});
