import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { runPayCalculationJob } from "@/lib/jobs/pay-run-calculation-job"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/pay-runs/{id}/calculate",
  summary: "Calculate a pay run",
  description:
    "Trigger calculation for all shifts in a pay run. Runs asynchronously for large pay runs. Poll GET /api/pay-runs/{id} for status.",
  tags: ["Payroll"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    202: z.object({ status: z.string(), payRunId: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const payRunId = params!.id

    // Start the job asynchronously (fire and forget)
    runPayCalculationJob(ctx.tenantId, payRunId).catch((err) => {
      console.error("[pay-runs/calculate] Job failed:", err)
    })

    return {
      status: 202,
      data: { status: "processing", payRunId },
    }
  },
})
