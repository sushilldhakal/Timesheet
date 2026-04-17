import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { connectDB, User } from "@/lib/db"
import { UserTenant } from "@/lib/db/schemas/user-tenant"
import { setAuthCookie } from "@/lib/auth/auth-helpers"
import { createFullAuthToken, getTenantContext } from "@/lib/auth/tenant-context"

const requestSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
})

const responseSchema = z.object({
  success: z.boolean(),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

/**
 * POST /api/auth/switch-org
 *
 * Allows a fully-authenticated user to switch to a different organisation
 * mid-session without re-entering their password.
 *
 * Verifies the user has an active UserTenant record for the requested tenantId,
 * then issues a new full JWT with the new tenant context.
 */
export const POST = createApiRoute({
  method: "POST",
  path: "/api/auth/switch-org",
  summary: "Switch organisation mid-session",
  description: "Issues a new full JWT for a different organisation the user belongs to",
  tags: ["Auth"],
  security: "jwt",
  request: { body: requestSchema },
  responses: {
    200: responseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const ctx = await getTenantContext()
      if (!ctx || ctx.type !== "full") {
        return { status: 401, data: { error: "Not authenticated" } }
      }

      if (!body) return { status: 400, data: { error: "Request body is required" } }
      const { tenantId } = body as any

      // Prevent a no-op switch to the same org
      if (tenantId === ctx.tenantId) {
        return { status: 200, data: { success: true } }
      }

      await connectDB()

      // Verify the user actually belongs to the requested org
      const membership = await UserTenant.findOne({
        userId: ctx.sub,
        tenantId,
        isActive: true,
      })
        .select("tenantId role location managedRoles")
        .lean()

      if (!membership) {
        return { status: 403, data: { error: "Not a member of this organisation" } }
      }

      const user = await User.findById(ctx.sub).select("email name").lean()
      const email = (user as any)?.email ?? ctx.email
      const name = (user as any)?.name ?? ctx.name ?? ""

      const locations = Array.isArray((membership as any).location)
        ? ((membership as any).location as any[]).map(String).filter(Boolean)
        : []
      const managedRoles = Array.isArray((membership as any).managedRoles)
        ? ((membership as any).managedRoles as any[]).map(String).filter(Boolean)
        : []

      const token = await createFullAuthToken({
        sub: ctx.sub,
        email: String(email ?? ""),
        name: String(name ?? ""),
        tenantId: String((membership as any).tenantId),
        role: String((membership as any).role ?? "user"),
        locations,
        managedRoles,
      })

      await setAuthCookie(token)

      return { status: 200, data: { success: true } }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/switch-org]", err)
      }
      return { status: 500, data: { error: "Failed to switch organisation" } }
    }
  },
})
