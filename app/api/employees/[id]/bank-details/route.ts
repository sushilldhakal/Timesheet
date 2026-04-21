import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  bankDetailsBodySchema,
  bankDetailsUpdateSchema,
  bankDetailsResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePayrollService } from "@/lib/services/employee/employee-payroll-service"

/** GET /api/employees/[id]/bank-details
 * Allowed: admin/manager/supervisor/super_admin OR the employee themselves */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/bank-details',
  summary: 'Get employee bank details',
  description: 'Fetch bank details for an employee. Account number is masked (last 4 digits only).',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: bankDetailsResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }

    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const result = await employeePayrollService.getBankDetails(params.id)
      return { status: 200, data: result }
    }

    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      const result = await employeePayrollService.getBankDetails(params.id)
      return { status: 200, data: result }
    }

    return { status: 401, data: { error: "Unauthorized" } }
  },
})

/** POST /api/employees/[id]/bank-details
 * Allowed: admin OR the employee themselves (creating their own bank details) */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/bank-details',
  summary: 'Create employee bank details',
  description: 'Create bank details for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: bankDetailsBodySchema },
  responses: {
    201: bankDetailsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }

    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const result = await employeePayrollService.createBankDetails(params.id, body)
      return { status: 201 as any, data: result }
    }

    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      const result = await employeePayrollService.createBankDetails(params.id, body)
      return { status: 201 as any, data: result }
    }

    return { status: 401, data: { error: "Unauthorized" } }
  },
})

/** PATCH /api/employees/[id]/bank-details
 * Allowed: admin OR the employee themselves (updating their own bank details) */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/bank-details',
  summary: 'Update employee bank details',
  description: 'Update bank details for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: bankDetailsUpdateSchema },
  responses: {
    200: bankDetailsResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }

    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const result = await employeePayrollService.updateBankDetails(params.id, body)
      return { status: 200, data: result }
    }

    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      const result = await employeePayrollService.updateBankDetails(params.id, body)
      return { status: 200, data: result }
    }

    return { status: 401, data: { error: "Unauthorized" } }
  },
})
