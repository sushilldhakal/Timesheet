import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  contractBodySchema,
  contractUpdateSchema,
  contractResponseSchema,
  contractListResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePayrollService } from "@/lib/services/employee/employee-payroll-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/contract',
  summary: 'Get employee contracts',
  description: 'Fetch all contracts for an employee (most recent first)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: contractListResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }
    const result = await employeePayrollService.listContracts(params.id)
    return { status: 200, data: result }
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/contract',
  summary: 'Create employee contract',
  description: 'Create a new contract for an employee. Deactivates any existing active contract.',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: contractBodySchema },
  responses: {
    201: contractResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.createContract(params.id, body)
    return { status: 201 as any, data: result }
  },
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/contract',
  summary: 'Update active employee contract',
  description: 'Update the currently active contract for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: contractUpdateSchema },
  responses: {
    200: contractResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.updateActiveContract(params.id, body)
    return { status: 200, data: result }
  },
})
