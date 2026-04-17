import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { notificationService } from "@/lib/services/notifications/notification-service"
import { z } from "zod"

export const POST = createApiRoute({
  method: "POST",
  path: "/api/notifications/read-all",
  summary: "Mark all notifications as read",
  description: "Mark all unread notifications as read for the current user",
  tags: ["Notifications"],
  security: "adminAuth",
  responses: {
    200: z.object({ message: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async () => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await notificationService.markRead(ctx, ctx.sub)
    return { status: 200, data: { message: "All notifications marked as read" } }
  },
})
