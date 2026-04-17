import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/pay-runs/{id}/approve",
  summary: "Approve a pay run",
  description: "Approve a calculated pay run. Pay run must be in 'calculated' status.",
  tags: ["Payroll"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ payRun: z.any() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const payRun = await scope(PayRun, ctx.tenantId).findById(params!.id)
    if (!payRun) {
      return { status: 404, data: { error: "Pay run not found" } }
    }

    if (payRun.status !== "calculated") {
      return {
        status: 400,
        data: { error: `Pay run must be in 'calculated' status to approve. Current status: ${payRun.status}` },
      }
    }

    const updated = await scope(PayRun, ctx.tenantId).findOneAndUpdate(
      { _id: params!.id },
      {
        $set: {
          status: "approved",
          approvedBy: ctx.sub,
          approvedAt: new Date(),
        },
      },
      { new: true }
    )

    return { status: 200, data: { payRun: updated } }
  },
})
