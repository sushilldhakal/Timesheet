import { z } from 'zod'
import { getAuthWithUserLocations } from '@/lib/auth/auth-api'
import { createApiRoute } from '@/lib/api/create-api-route'
import { errorResponseSchema } from '@/lib/validations/auth'
import { apiErrors } from '@/lib/api/api-error'
import { employeeTaxInfoService } from '@/lib/services/employee/employee-tax-info-service'

const employeeIdParamSchema = z.object({ id: z.string() })

const createTaxInfoSchema = z.object({
  countrySnapshot: z.enum(['AU', 'IN', 'NP', 'UK', 'SG', 'NZ', 'US', 'CA']),
  taxData: z.record(z.string(), z.any()),
  bankData: z.record(z.string(), z.any()),
})

const taxInfoResponseSchema = z.object({
  taxInfo: z.object({
    id: z.string(),
    countrySnapshot: z.string(),
    taxIdMasked: z.string(),
    taxIdType: z.string(),
    bankAccountMasked: z.string(),
    bankRoutingMasked: z.string(),
    bankRoutingType: z.string(),
    bankAccountName: z.string(),
    bankName: z.string().nullable(),
    countryName: z.string(),
    currency: z.string(),
  }),
})

/** GET /api/employees/[id]/tax-info */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/tax-info',
  summary: 'Get employee tax information',
  description: 'Fetch tax and bank details for an employee. All sensitive data is masked.',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: taxInfoResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params) throw apiErrors.badRequest('Employee ID is required')
    const data = await employeeTaxInfoService.getTaxInfo(ctx, params.id)
    return { status: 200, data }
  },
})

/** POST /api/employees/[id]/tax-info */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/tax-info',
  summary: 'Create employee tax information',
  description: 'Add tax and bank details for an employee (country-specific, encrypted)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: createTaxInfoSchema,
  },
  responses: {
    200: taxInfoResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params || !body) throw apiErrors.badRequest('Employee ID and body required')
    const data = await employeeTaxInfoService.createTaxInfo(ctx, params.id, body)
    return { status: 200, data }
  },
})

/** PATCH /api/employees/[id]/tax-info */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/tax-info',
  summary: 'Update employee tax information',
  description: 'Update tax and/or bank details for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: createTaxInfoSchema.partial(),
  },
  responses: {
    200: taxInfoResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params || !body) throw apiErrors.badRequest('Employee ID and body required')
    const data = await employeeTaxInfoService.updateTaxInfo(ctx, params.id, body)
    return { status: 200, data }
  },
})
