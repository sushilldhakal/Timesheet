import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { payRunService } from "@/lib/services/pay-run/pay-run-service"

const payRunParamsSchema = z.object({
  id: z.string()
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/pay-runs/[id]/status',
  summary: 'Get pay run calculation status',
  description: 'Get the status of a pay run calculation job (BullMQ)',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    params: payRunParamsSchema,
  },
  responses: {
    200: z.object({
      payRunStatus: z.string(),
      job: z.object({
        status: z.string(),
        progress: z.any().optional(),
        result: z.any().optional(),
      }),
      jobError: z.string().optional(),
      totals: z.object({
        gross: z.number(),
        tax: z.number(),
        super: z.number(),
        net: z.number(),
        totalHours: z.number(),
        employeeCount: z.number(),
      }).optional(),
    }),
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
      const result = await payRunService.getStatus(id)
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/pay-runs/[id]/status GET]", err)
      return {
        status: 500,
        data: { error: "Failed to get job status" }
      }
    }
  }
})