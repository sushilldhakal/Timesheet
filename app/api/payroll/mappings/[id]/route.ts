import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayrollMapping } from "@/lib/db/schemas/payroll-mapping"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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
      await connectDB()

      const mapping = await PayrollMapping.findOne({
        _id: params!.id,
        tenantId: ctx.tenantId
      }).lean()

      if (!mapping) {
        return { status: 404, data: { error: "Payroll mapping not found" } }
      }

      return { status: 200, data: { mapping } }
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
      await connectDB()

      const existing = await PayrollMapping.findOne({
        _id: params!.id,
        tenantId: ctx.tenantId
      })

      if (!existing) {
        return { status: 404, data: { error: "Payroll mapping not found" } }
      }

      if (body!.isDefault) {
        await PayrollMapping.updateMany(
          {
            tenantId: ctx.tenantId,
            payrollSystemType: existing.payrollSystemType,
            isDefault: true,
            _id: { $ne: existing._id }
          },
          { isDefault: false }
        )
      }

      const mapping = await PayrollMapping.findByIdAndUpdate(
        params!.id,
        { $set: body },
        { new: true, runValidators: true }
      ).lean()

      return { status: 200, data: { mapping } }
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
      await connectDB()

      const mapping = await PayrollMapping.findOne({
        _id: params!.id,
        tenantId: ctx.tenantId
      })

      if (!mapping) {
        return { status: 404, data: { error: "Payroll mapping not found" } }
      }

      if (mapping.isDefault) {
        return { status: 400, data: { error: "Cannot delete default payroll mapping. Unset it as default first." } }
      }

      await PayrollMapping.findByIdAndDelete(params!.id)

      return { status: 200, data: { message: "Payroll mapping deleted" } }
    } catch (err) {
      console.error("[api/payroll/mappings/[id] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete payroll mapping" } }
    }
  }
})
