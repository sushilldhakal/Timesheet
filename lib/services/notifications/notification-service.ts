import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import {
  Notification,
  INotification,
  NotificationCategory,
  NotificationChannel,
} from "@/lib/db/schemas/notification"
import { NotificationPreference } from "@/lib/db/schemas/notification-preference"
import { pushService } from "./push-service"

export class NotificationService {
  /**
   * Create and dispatch a notification.
   * Checks NotificationPreference before sending — respects user opt-outs.
   * Persists to DB + triggers push if channel includes "push".
   */
  async send(
    ctx: TenantContext,
    params: {
      targetType: "user" | "employee"
      targetId: string
      category: NotificationCategory
      title: string
      message: string
      relatedEntity?: { type: string; id: string }
      channels?: NotificationChannel[]
    }
  ): Promise<INotification | null> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const tenantId = (ctx as { tenantId: string }).tenantId
    let effectiveChannels: NotificationChannel[] = params.channels ?? ["in_app"]

    // ── Preference check ──────────────────────────────────────────────────────
    // Only applies to user targets (employees don't have preference records yet)
    if (params.targetType === "user") {
      const pref = await scope(NotificationPreference, tenantId)
        .findOne({ recipientId: params.targetId, recipientType: "user" })
        .lean()

      if (pref) {
        // Respect global channel toggles
        if (!pref.globalPushEnabled) {
          effectiveChannels = effectiveChannels.filter((c) => c !== "push")
        }
        if (!pref.globalEmailEnabled) {
          effectiveChannels = effectiveChannels.filter((c) => c !== "email")
        }

        // Respect per-category preferences
        const catPref = pref.preferences.find((p: { category: string }) => p.category === params.category)
        if (catPref) {
          if (!catPref.enabled) {
            // User has opted out of this category entirely — skip
            return null
          }
          // Intersect requested channels with what the user allows for this category
          effectiveChannels = effectiveChannels.filter((c) =>
            catPref.channels.includes(c as any)
          )
        }
      }
    }

    // Nothing left to send after preference filtering
    if (effectiveChannels.length === 0) return null
    // ─────────────────────────────────────────────────────────────────────────

    const notificationData: Partial<INotification> = {
      tenantId: tenantId as any,
      targetType: params.targetType,
      category: params.category,
      title: params.title,
      message: params.message,
      read: false,
      sentAt: new Date(),
      relatedEntity: params.relatedEntity,
      channels: effectiveChannels,
    }

    if (params.targetType === "user") {
      notificationData.userId = params.targetId as any
    } else {
      notificationData.employeeId = params.targetId as any
    }

    const notification = await scope(Notification, tenantId).create(notificationData)

    // Dispatch push notification if channel is still in effectiveChannels
    if (effectiveChannels.includes("push")) {
      try {
        const pushPayload = { title: params.title, body: params.message }
        let pushResult: { sent: number; failed: number }

        if (params.targetType === "user") {
          pushResult = await pushService.sendToUser(ctx, params.targetId, pushPayload)
        } else {
          pushResult = await pushService.sendToEmployee(ctx, params.targetId, pushPayload)
        }

        if (pushResult.sent > 0) {
          await scope(Notification, tenantId).findOneAndUpdate(
            { _id: notification._id },
            { $set: { pushSentAt: new Date() } }
          )
        }
      } catch {
        // Non-critical — don't fail the notification if push fails
      }
    }

    return notification.toObject()
  }

  async markRead(
    ctx: TenantContext,
    userId: string,
    notificationId?: string
  ): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const filter: Record<string, unknown> = { userId, read: false }
    if (notificationId) filter._id = notificationId

    await scope(Notification, tenantId).updateMany(filter, {
      $set: { read: true, readAt: new Date() },
    })
  }

  async getUnread(ctx: TenantContext, userId: string): Promise<INotification[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    return scope(Notification, tenantId)
      .find({ userId, read: false })
      .sort({ sentAt: -1 })
      .lean() as Promise<INotification[]>
  }

  async getAll(
    ctx: TenantContext,
    userId: string,
    opts?: { read?: boolean; limit?: number; skip?: number }
  ): Promise<INotification[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const filter: Record<string, unknown> = { userId }
    if (opts?.read !== undefined) filter.read = opts.read

    return scope(Notification, tenantId)
      .find(filter)
      .sort({ sentAt: -1 })
      .limit(opts?.limit ?? 50)
      .lean() as Promise<INotification[]>
  }
}

export const notificationService = new NotificationService()
