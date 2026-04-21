import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  complianceUpdateSchema,
  complianceResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePayrollService } from "@/lib/services/employee/employee-payroll-service"

/** GET /api/employees/[id]/compliance
 * Allowed: admin/manager/supervisor/super_admin OR the employee themselves (read-only) */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/compliance',
  summary: 'Get employee compliance record',
  description: 'Fetch compliance record for an employee, including alerts for expiring certifications',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: complianceResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }

    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const result = await employeePayrollService.getCompliance(params.id)
      return { status: 200, data: result }
    }

    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      const result = await employeePayrollService.getCompliance(params.id)
      return { status: 200, data: result }
    }

    return { status: 401, data: { error: "Unauthorized" } }
  },
})

/** PATCH /api/employees/[id]/compliance — admin only */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/compliance',
  summary: 'Update employee compliance record',
  description: 'Update compliance fields for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: complianceUpdateSchema },
  responses: {
    200: complianceResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.updateCompliance(params.id, body)
    return { status: 200, data: result }
  },
})
