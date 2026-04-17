import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { ClockAudit } from "@/lib/db/schemas/clock-audit"
import { z } from "zod"

const querySchema = z.object({
  employeeId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  minRisk: z.string().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/clock/audit",
  summary: "Clock audit log",
  description: "Get clock audit records with optional risk score filtering",
  tags: ["Clock"],
  security: "adminAuth",
  request: {
    query: querySchema,
  },
  responses: {
    200: z.object({ audits: z.array(z.any()), total: z.number() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (query?.employeeId) filter.employeeId = query.employeeId
    if (query?.from || query?.to) {
      filter.recordedAt = {}
      if (query.from) (filter.recordedAt as any).$gte = new Date(query.from)
      if (query.to) (filter.recordedAt as any).$lte = new Date(query.to)
    }
    if (query?.minRisk) {
      filter.riskScore = { $gte: parseInt(query.minRisk, 10) }
    }

    const [audits, total] = await Promise.all([
      scope(ClockAudit, ctx.tenantId).find(filter).sort({ recordedAt: -1 }).limit(100).lean(),
      scope(ClockAudit, ctx.tenantId).countDocuments(filter),
    ])

    return { status: 200, data: { audits, total } }
  },
})
