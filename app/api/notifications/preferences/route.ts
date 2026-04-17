import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { NotificationPreference } from "@/lib/db/schemas/notification-preference"
import { z } from "zod"

const categoryPreferenceSchema = z.object({
  category: z.string(),
  channels: z.array(z.enum(["in_app", "push", "email"])),
  enabled: z.boolean(),
})

const bodySchema = z.object({
  preferences: z.array(categoryPreferenceSchema),
  globalPushEnabled: z.boolean(),
  globalEmailEnabled: z.boolean(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/notifications/preferences",
  summary: "Get notification preferences",
  description: "Get the current user's notification preferences",
  tags: ["Notifications"],
  security: "adminAuth",
  responses: {
    200: z.object({ preferences: z.any() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async () => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const prefs = await scope(NotificationPreference, ctx.tenantId)
      .findOne({ recipientId: ctx.sub, recipientType: "user" })
      .lean()

    // Return defaults if no preferences set yet
    return {
      status: 200,
      data: {
        preferences: prefs ?? {
          recipientId: ctx.sub,
          recipientType: "user",
          preferences: [],
          globalPushEnabled: true,
          globalEmailEnabled: true,
        },
      },
    }
  },
})

export const PUT = createApiRoute({
  method: "PUT",
  path: "/api/notifications/preferences",
  summary: "Update notification preferences",
  description: "Upsert the current user's notification preferences",
  tags: ["Notifications"],
  security: "adminAuth",
  request: { body: bodySchema },
  responses: {
    200: z.object({ preferences: z.any() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const prefs = await scope(NotificationPreference, ctx.tenantId).findOneAndUpdate(
      { recipientId: ctx.sub, recipientType: "user" },
      {
        $set: {
          tenantId: ctx.tenantId,
          recipientId: ctx.sub,
          recipientType: "user",
          preferences: body!.preferences,
          globalPushEnabled: body!.globalPushEnabled,
          globalEmailEnabled: body!.globalEmailEnabled,
        },
      },
      { upsert: true, new: true }
    )

    return { status: 200, data: { preferences: prefs } }
  },
})
