import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayrollMapping } from "@/lib/db/schemas/payroll-mapping"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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
      await connectDB()

      const filter: Record<string, unknown> = { tenantId: ctx.tenantId }
      if (query?.payrollSystemType) {
        filter.payrollSystemType = query.payrollSystemType
      }

      const mappings = await PayrollMapping.find(filter)
        .sort({ isDefault: -1, updatedAt: -1 })
        .lean()

      return { status: 200, data: { mappings } }
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
      await connectDB()

      if (body!.isDefault) {
        await PayrollMapping.updateMany(
          {
            tenantId: ctx.tenantId,
            payrollSystemType: body!.payrollSystemType,
            isDefault: true
          },
          { isDefault: false }
        )
      }

      const mapping = await PayrollMapping.create({
        ...body,
        tenantId: ctx.tenantId
      })

      return { status: 201, data: { mapping } }
    } catch (err) {
      console.error("[api/payroll/mappings POST]", err)
      return { status: 500, data: { error: "Failed to create payroll mapping" } }
    }
  }
})
