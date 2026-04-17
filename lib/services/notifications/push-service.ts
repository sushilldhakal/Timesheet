import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { PushToken } from "@/lib/db/schemas/push-token"

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Push notification service — wraps Firebase FCM / web push.
 * Requires FIREBASE_SERVER_KEY env var for FCM.
 */
export class PushService {
  /**
   * Send a push notification to a user or employee.
   * Looks up active PushToken records and dispatches to each device.
   */
  async sendToUser(
    ctx: TenantContext,
    userId: string,
    payload: PushPayload
  ): Promise<{ sent: number; failed: number }> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const tokens = await scope(PushToken, ctx.tenantId)
      .find({ userId, isActive: true })
      .lean()

    return this.dispatchToTokens(tokens, payload)
  }

  /**
   * Send a push notification to an employee.
   */
  async sendToEmployee(
    ctx: TenantContext,
    employeeId: string,
    payload: PushPayload
  ): Promise<{ sent: number; failed: number }> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const tokens = await scope(PushToken, ctx.tenantId)
      .find({ employeeId, isActive: true })
      .lean()

    return this.dispatchToTokens(tokens, payload)
  }

  /**
   * Register or update a push token for a user/employee.
   */
  async registerToken(
    ctx: TenantContext,
    params: {
      token: string
      deviceType: "ios" | "android" | "web"
      userId?: string
      employeeId?: string
    }
  ): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    await scope(PushToken, ctx.tenantId).findOneAndUpdate(
      { token: params.token },
      {
        $set: {
          tenantId: ctx.tenantId,
          token: params.token,
          deviceType: params.deviceType,
          userId: params.userId,
          employeeId: params.employeeId,
          isActive: true,
          lastUsedAt: new Date(),
        },
      },
      { upsert: true }
    )
  }

  /**
   * Deactivate a push token (e.g., on logout).
   */
  async deactivateToken(ctx: TenantContext, token: string): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    await scope(PushToken, ctx.tenantId).findOneAndUpdate(
      { token },
      { $set: { isActive: false } }
    )
  }

  /**
   * Dispatch push notifications to a list of tokens.
   * Uses FCM if FIREBASE_SERVER_KEY is set, otherwise logs (dev mode).
   */
  private async dispatchToTokens(
    tokens: Array<{ token: string; deviceType: string }>,
    payload: PushPayload
  ): Promise<{ sent: number; failed: number }> {
    if (tokens.length === 0) return { sent: 0, failed: 0 }

    const fcmKey = process.env.FIREBASE_SERVER_KEY
    if (!fcmKey) {
      // Dev mode — log instead of sending
      console.log("[PushService] FCM key not configured. Would send to:", tokens.length, "devices")
      console.log("[PushService] Payload:", payload)
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    for (const tokenRecord of tokens) {
      try {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${fcmKey}`,
          },
          body: JSON.stringify({
            to: tokenRecord.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data ?? {},
          }),
        })

        if (response.ok) {
          sent++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    return { sent, failed }
  }
}

export const pushService = new PushService()
