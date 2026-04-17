import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { shiftAuditService } from "@/lib/services/audit/shift-audit-service"
import { z } from "zod"

const paramsSchema = z.object({ shiftId: z.string() })

export const GET = createApiRoute({
  method: "GET",
  path: "/api/shifts/{shiftId}/history",
  summary: "Get shift audit history",
  description: "Get the chronological event history for a shift (who changed what and when)",
  tags: ["Shifts", "Audit"],
  security: "adminAuth",
  request: { params: paramsSchema },
  responses: {
    200: z.object({ events: z.array(z.any()), count: z.number() }),
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

    const events = await shiftAuditService.getShiftHistory(ctx.tenantId, params!.shiftId)
    return { status: 200, data: { events, count: events.length } }
  },
})
