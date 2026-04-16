import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { payRunService } from "@/lib/services/pay-run/pay-run-service"

const payRunParamsSchema = z.object({
  id: z.string()
})

const payItemSchema = z.object({
  type: z.string(),
  name: z.string(),
  exportName: z.string(),
  from: z.date(),
  to: z.date(),
  hours: z.number(),
  rate: z.number(),
  multiplier: z.number(),
  amount: z.number()
})

const employeePayDataSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  totalHours: z.number(),
  totalAmount: z.number(),
  payItems: z.array(payItemSchema)
})

const exportResponseSchema = z.object({
  payRun: z.object({
    _id: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    status: z.string(),
    totals: z.object({
      gross: z.number(),
      tax: z.number(),
      super: z.number(),
      net: z.number(),
      totalHours: z.number(),
      employeeCount: z.number()
    })
  }),
  employees: z.array(employeePayDataSchema)
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/pay-runs/[id]/export',
  summary: 'Export pay run',
  description: 'Export all pay items for this pay run in Tanda-compatible format',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    params: payRunParamsSchema,
  },
  responses: {
    200: exportResponseSchema,
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { id } = params!

    try {
      const result = await payRunService.exportPayRun(id)
      return { status: 200, data: result }

    } catch (err) {
      console.error("[api/pay-runs/[id]/export GET]", err)
      return {
        status: 500,
        data: { error: "Failed to export pay run" }
      }
    }
  }
})
