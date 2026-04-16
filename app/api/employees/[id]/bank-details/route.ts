import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  bankDetailsBodySchema,
  bankDetailsUpdateSchema,
  bankDetailsResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePayrollService } from "@/lib/services/employee/employee-payroll-service"

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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }
    const result = await employeePayrollService.getBankDetails(params.id)
    return { status: 200, data: result }
  },
})

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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.createBankDetails(params.id, body)
    return { status: 201 as any, data: result }
  },
})

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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.updateBankDetails(params.id, body)
    return { status: 200, data: result }
  },
})
