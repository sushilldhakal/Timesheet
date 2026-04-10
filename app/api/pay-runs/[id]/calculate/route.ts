import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { queuePayRunCalculation } from "@/lib/jobs/queue"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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
      await connectDB()

      const payRun = await PayRun.findById(id)
      if (!payRun) {
        return {
          status: 404,
          data: { error: "Pay run not found" }
        }
      }

      if (payRun.status !== 'draft') {
        return {
          status: 400,
          data: { 
            error: `Cannot calculate pay run with status '${payRun.status}'`,
            details: "Only draft pay runs can be calculated"
          }
        }
      }

      try {
        const job = await queuePayRunCalculation({
          payRunId: payRun._id.toString(),
          tenantId: payRun.tenantId.toString(),
          startDate: payRun.startDate.toISOString(),
          endDate: payRun.endDate.toISOString(),
          userId: String(ctx.auth.sub),
        })

        return {
          status: 202,
          data: {
            accepted: true,
            payRunId: payRun._id.toString(),
            jobId: String(job.id ?? `payrun-${payRun._id.toString()}`),
          },
        }
      } catch (queueErr: any) {
        const msg = typeof queueErr?.message === 'string' ? queueErr.message : 'Failed to queue job'
        const isDuplicate = msg.toLowerCase().includes('job') && msg.toLowerCase().includes('exists')
        return {
          status: isDuplicate ? 409 : 500,
          data: { error: isDuplicate ? "Pay run calculation is already queued or running" : "Failed to start pay run calculation", details: msg },
        }
      }

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
