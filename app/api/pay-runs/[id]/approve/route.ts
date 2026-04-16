import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { payRunService } from "@/lib/services/pay-run/pay-run-service"

const payRunParamsSchema = z.object({
  id: z.string()
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/pay-runs/[id]/approve',
  summary: 'Approve pay run',
  description: 'Approve a calculated pay run, setting status to approved',
  tags: ['PayRuns'],
  security: 'adminAuth',
  request: {
    params: payRunParamsSchema,
  },
  responses: {
    200: z.object({
      success: z.boolean(),
      payRun: z.object({
        _id: z.string(),
        status: z.string(),
        approvedBy: z.string(),
        approvedAt: z.date()
      })
    }),
    400: z.object({ error: z.string() }),
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
      const result = await payRunService.approvePayRun({ ctx, id })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[api/pay-runs/[id]/approve POST]", err)
      return {
        status: 500,
        data: { error: "Failed to approve pay run" }
      }
    }
  }
})
