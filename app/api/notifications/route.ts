import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { Notification } from "@/lib/db/schemas/notification"
import { z } from "zod"

const querySchema = z.object({
  read: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/notifications",
  summary: "Get notifications",
  description: "Get notifications for the current user. Use ?read=false for unread only.",
  tags: ["Notifications"],
  security: "adminAuth",
  request: { query: querySchema },
  responses: {
    200: z.object({
      notifications: z.array(z.any()),
      total: z.number(),
      unreadCount: z.number(),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const page = Math.max(1, parseInt(query?.page ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit ?? "50", 10)))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = { userId: ctx.sub }
    if (query?.read === "false") filter.read = false
    if (query?.read === "true") filter.read = true

    const [notifications, total, unreadCount] = await Promise.all([
      scope(Notification, ctx.tenantId)
        .find(filter)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      scope(Notification, ctx.tenantId).countDocuments(filter),
      scope(Notification, ctx.tenantId).countDocuments({ userId: ctx.sub, read: false }),
    ])

    return { status: 200, data: { notifications, total, unreadCount } }
  },
})
