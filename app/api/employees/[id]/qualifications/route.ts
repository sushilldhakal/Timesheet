import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  qualificationBodySchema,
  qualificationUpdateSchema,
  qualificationListResponseSchema,
  qualificationResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeePayrollService } from "@/lib/services/employee/employee-payroll-service"

/** GET /api/employees/[id]/qualifications
 * Allowed: admin/manager/supervisor/super_admin OR the employee themselves (read-only) */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/qualifications',
  summary: 'List employee qualifications',
  description: 'Fetch all qualifications/certifications for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: qualificationListResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }

    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const result = await employeePayrollService.listQualifications(params.id)
      return { status: 200, data: result }
    }

    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      const result = await employeePayrollService.listQualifications(params.id)
      return { status: 200, data: result }
    }

    return { status: 401, data: { error: "Unauthorized" } }
  },
})

/** POST /api/employees/[id]/qualifications — admin only */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/qualifications',
  summary: 'Add employee qualification',
  description: 'Add a new qualification or certification for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: qualificationBodySchema },
  responses: {
    201: qualificationResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.addQualification(params.id, body)
    return { status: 201 as any, data: result }
  },
})

/** PATCH /api/employees/[id]/qualifications — admin only */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/qualifications',
  summary: 'Update employee qualification',
  description: 'Update a specific qualification by qualificationId (passed in body)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: qualificationUpdateSchema.extend({
      qualificationId: z.string(),
    }),
  },
  responses: {
    200: qualificationResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }
    const result = await employeePayrollService.updateQualification(params.id, body)
    return { status: 200, data: result }
  },
})

/** DELETE /api/employees/[id]/qualifications — admin only */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}/qualifications',
  summary: 'Remove employee qualification',
  description: 'Delete a qualification by qualificationId (passed as query param)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: z.object({ qualificationId: z.string() }),
  },
  responses: {
    200: z.object({ success: z.boolean() }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }
    const qualificationId = (query as any)?.qualificationId
    if (!qualificationId) return { status: 400, data: { error: "qualificationId query param required" } }
    const result = await employeePayrollService.deleteQualification(params.id, qualificationId)
    return { status: 200, data: result }
  },
})
