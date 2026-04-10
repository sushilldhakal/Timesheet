import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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
      await connectDB()

      const payRun = await PayRun.findById(id)

      if (!payRun) {
        return {
          status: 404,
          data: { error: "Pay run not found" }
        }
      }

      if (payRun.status !== 'calculated') {
        return {
          status: 400,
          data: { error: `Cannot approve pay run with status '${payRun.status}'. Must be 'calculated'.` }
        }
      }

      payRun.status = 'approved'
      payRun.approvedBy = ctx.auth.sub as any
      payRun.approvedAt = new Date()

      await payRun.save()

      return {
        status: 200,
        data: {
          success: true,
          payRun: {
            _id: payRun._id.toString(),
            status: payRun.status,
            approvedBy: payRun.approvedBy!.toString(),
            approvedAt: payRun.approvedAt!
          }
        }
      }
    } catch (err) {
      console.error("[api/pay-runs/[id]/approve POST]", err)
      return {
        status: 500,
        data: { error: "Failed to approve pay run" }
      }
    }
  }
})
