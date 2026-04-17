import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { DomainEventLog } from "@/lib/db/schemas/domain-event-log"
import { scope } from "@/lib/db/tenant-model"
import { z } from "zod"

export const GET = createApiRoute({
  method: "GET",
  path: "/api/admin/event-health",
  summary: "Event bus health",
  description: "Returns event bus health metrics: unprocessed events, failure rates, retry counts",
  tags: ["Admin", "Observability"],
  security: "adminAuth",
  responses: {
    200: z.object({
      unprocessed: z.number(),
      retryExceeded: z.number(),
      total24h: z.number(),
      processed24h: z.number(),
      failureRate: z.number(),
      recentFailures: z.array(z.any()),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async () => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const now = new Date()
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [unprocessed, retryExceeded, total24h, processed24h, recentFailures] =
      await Promise.all([
        scope(DomainEventLog, ctx.tenantId).countDocuments({
          processedAt: { $exists: false },
        }),
        scope(DomainEventLog, ctx.tenantId).countDocuments({
          retryCount: { $gte: 5 },
          processedAt: { $exists: false },
        }),
        scope(DomainEventLog, ctx.tenantId).countDocuments({
          occurredAt: { $gte: ago24h },
        }),
        scope(DomainEventLog, ctx.tenantId).countDocuments({
          processedAt: { $gte: ago24h },
        }),
        scope(DomainEventLog, ctx.tenantId)
          .find({
            failedListeners: { $exists: true, $not: { $size: 0 } },
            occurredAt: { $gte: ago24h },
          })
          .sort({ occurredAt: -1 })
          .limit(10)
          .select("eventType entityId failedListeners retryCount occurredAt")
          .lean(),
      ])

    const failureRate = total24h > 0 ? ((total24h - processed24h) / total24h) * 100 : 0

    return {
      status: 200,
      data: {
        unprocessed,
        retryExceeded,
        total24h,
        processed24h,
        failureRate: Math.round(failureRate * 100) / 100,
        recentFailures,
      },
    }
  },
})
