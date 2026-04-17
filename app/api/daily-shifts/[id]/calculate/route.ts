import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { payCalculationService } from "@/lib/services/payroll/pay-calculation-service"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

const bodySchema = z.object({
  forceRecalculate: z.boolean().optional().default(false),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/daily-shifts/{id}/calculate",
  summary: "Calculate pay for a shift",
  description: "Trigger pay calculation for a specific shift. Idempotent — safe to call multiple times.",
  tags: ["Shifts", "Payroll"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
    body: bodySchema,
  },
  responses: {
    200: z.object({ computed: z.any() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      const computed = await payCalculationService.calculateShift(ctx, params!.id, {
        forceRecalculate: body?.forceRecalculate,
      })
      return { status: 200, data: { computed } }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Calculation failed"
      if (message === "Shift not found") {
        return { status: 404, data: { error: message } }
      }
      return { status: 500, data: { error: message } }
    }
  },
})
