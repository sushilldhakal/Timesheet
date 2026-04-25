import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  absencesQuerySchema,
  leaveRecordCreateSchema,
  absencesListResponseSchema,
  leaveRecordCreateResponseSchema
} from "@/lib/validations/employee-absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeAbsencesService } from "@/lib/services/employee/employee-absences-service"
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns"

/**
 * GET /api/employees/[id]/absences?startDate=...&endDate=...
 * Get leave records for an employee
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/absences',
  summary: 'Get employee absences',
  description: 'Get leave records for an employee within a date range',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: absencesQuerySchema
  },
  responses: {
    200: absencesListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    if (!params) {
      return {
        status: 400,
        data: { error: "Employee ID is required" }
      };
    }

    const { id } = params;
    const now = new Date()
    const defaultStart = format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd")
    const defaultEnd = format(endOfMonth(addMonths(now, 3)), "yyyy-MM-dd")

    const startDate = query?.startDate ?? defaultStart
    const endDate = query?.endDate ?? defaultEnd

    try {
      const ctx = await getAuthWithUserLocations()
      if (!ctx) {
        const employee = await getEmployeeFromCookie()
        if (!employee || employee.sub !== id) {
          return { status: 401, data: { error: "Unauthorized" } }
        }
      }

      return await employeeAbsencesService.list(id, startDate, endDate)
    } catch (err) {
      console.error("[api/employees/[id]/absences GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch leave records" }
      };
    }
  }
});

/**
 * POST /api/employees/[id]/absences
 * Create a new leave record
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/absences',
  summary: 'Create employee absence',
  description: 'Create a new leave record for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: leaveRecordCreateSchema
  },
  responses: {
    201: leaveRecordCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    if (!params || !body) {
      return {
        status: 400,
        data: { error: "Employee ID and request body are required" }
      };
    }

    const { id } = params;

    try {
      const ctx = await getAuthWithUserLocations()
      if (!ctx) {
        const employee = await getEmployeeFromCookie()
        if (!employee || employee.sub !== id) {
          return { status: 401, data: { error: "Unauthorized" } }
        }
      }

      return await employeeAbsencesService.create(id, body)
    } catch (err) {
      console.error("[api/employees/[id]/absences POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create leave record" }
      };
    }
  }
});
