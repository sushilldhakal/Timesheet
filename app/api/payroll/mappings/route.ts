import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { payrollMappingsService } from "@/lib/services/payroll/payroll-mappings-service"

const querySchema = z.object({
  payrollSystemType: z.enum(['xero', 'myob', 'apa', 'custom']).optional()
})

const createMappingSchema = z.object({
  payrollSystemType: z.enum(['xero', 'myob', 'apa', 'custom']),
  ruleMapping: z.array(z.object({
    exportName: z.string().min(1),
    payrollCode: z.string().min(2),
    description: z.string().default('')
  })).default([]),
  payItemMapping: z.array(z.object({
    type: z.enum(['pay', 'deduction', 'leave_accrual']),
    exportName: z.string().min(1),
    payrollCode: z.string().min(2),
    description: z.string().default('')
  })).default([]),
  breakMapping: z.array(z.object({
    breakType: z.string().min(1),
    exportName: z.string().min(1),
    payrollCode: z.string().min(2)
  })).default([]),
  isDefault: z.boolean().default(false),
  notes: z.string().optional()
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/payroll/mappings',
  summary: 'List payroll mappings',
  description: 'Get payroll mappings for the current tenant',
  tags: ['PayrollMappings'],
  security: 'adminAuth',
  request: { query: querySchema },
  responses: {
    200: z.object({ mappings: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return { status: 200, data: await payrollMappingsService.list(ctx, query) }
    } catch (err) {
      console.error("[api/payroll/mappings GET]", err)
      return { status: 500, data: { error: "Failed to fetch payroll mappings" } }
    }
  }
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/payroll/mappings',
  summary: 'Create payroll mapping',
  description: 'Create a new payroll system mapping configuration',
  tags: ['PayrollMappings'],
  security: 'adminAuth',
  request: { body: createMappingSchema },
  responses: {
    201: z.object({ mapping: z.any() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return { status: 201, data: await payrollMappingsService.create(ctx, body) }
    } catch (err) {
      console.error("[api/payroll/mappings POST]", err)
      return { status: 500, data: { error: "Failed to create payroll mapping" } }
    }
  }
})
