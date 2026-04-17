import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { notificationService } from "@/lib/services/notifications/notification-service"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/notifications/{id}/read",
  summary: "Mark notification as read",
  description: "Mark a specific notification as read",
  tags: ["Notifications"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ message: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await notificationService.markRead(ctx, ctx.sub, params!.id)
    return { status: 200, data: { message: "Notification marked as read" } }
  },
})
