import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { payrollMappingsService } from "@/lib/services/payroll/payroll-mappings-service"

const paramsSchema = z.object({
  id: z.string()
})

const updateMappingSchema = z.object({
  ruleMapping: z.array(z.object({
    exportName: z.string().min(1),
    payrollCode: z.string().min(2),
    description: z.string().default('')
  })).optional(),
  payItemMapping: z.array(z.object({
    type: z.enum(['pay', 'deduction', 'leave_accrual']),
    exportName: z.string().min(1),
    payrollCode: z.string().min(2),
    description: z.string().default('')
  })).optional(),
  breakMapping: z.array(z.object({
    breakType: z.string().min(1),
    exportName: z.string().min(1),
    payrollCode: z.string().min(2)
  })).optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional()
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/payroll/mappings/[id]',
  summary: 'Get payroll mapping',
  description: 'Get a single payroll mapping by ID',
  tags: ['PayrollMappings'],
  security: 'adminAuth',
  request: { params: paramsSchema },
  responses: {
    200: z.object({ mapping: z.any() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return await payrollMappingsService.get(ctx, params!.id)
    } catch (err) {
      console.error("[api/payroll/mappings/[id] GET]", err)
      return { status: 500, data: { error: "Failed to fetch payroll mapping" } }
    }
  }
})

export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/payroll/mappings/[id]',
  summary: 'Update payroll mapping',
  description: 'Update an existing payroll mapping configuration',
  tags: ['PayrollMappings'],
  security: 'adminAuth',
  request: { params: paramsSchema, body: updateMappingSchema },
  responses: {
    200: z.object({ mapping: z.any() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return await payrollMappingsService.update(ctx, params!.id, body)
    } catch (err) {
      console.error("[api/payroll/mappings/[id] PUT]", err)
      return { status: 500, data: { error: "Failed to update payroll mapping" } }
    }
  }
})

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/payroll/mappings/[id]',
  summary: 'Delete payroll mapping',
  description: 'Delete a payroll mapping (cannot delete default mappings)',
  tags: ['PayrollMappings'],
  security: 'adminAuth',
  request: { params: paramsSchema },
  responses: {
    200: z.object({ message: z.string() }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return await payrollMappingsService.remove(ctx, params!.id)
    } catch (err) {
      console.error("[api/payroll/mappings/[id] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete payroll mapping" } }
    }
  }
})
