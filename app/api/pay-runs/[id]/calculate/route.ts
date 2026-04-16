import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { payRunService } from "@/lib/services/pay-run/pay-run-service"

const payRunParamsSchema = z.object({
  id: z.string()
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/pay-runs/[id]/calculate',
  summary: 'Queue pay run calculation',
  description: 'Start pay run calculation as an async BullMQ job',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    params: payRunParamsSchema,
  },
  responses: {
    202: z.object({
      accepted: z.boolean(),
      payRunId: z.string(),
      jobId: z.string().optional(),
    }),
    400: z.object({ error: z.string(), details: z.string().optional() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
    500: z.object({ error: z.string(), details: z.string().optional() })
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
      const result = await payRunService.queueCalculation({ ctx, id })
      return { status: 202, data: result }
    } catch (err) {
      console.error("[api/pay-runs/[id]/calculate POST]", err)
      return {
        status: 500,
        data: { 
          error: "Failed to start pay run calculation",
          details: err instanceof Error ? err.message : "Unknown error"
        }
      }
    }
  }
})
