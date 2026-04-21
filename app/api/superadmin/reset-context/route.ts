import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { connectDB, User } from "@/lib/db"
import { setAuthCookie } from "@/lib/auth/auth-helpers"
import { createFullAuthToken, getTenantContext } from "@/lib/auth/tenant-context"
import { isSuperAdmin } from "@/lib/config/roles"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-api"

const responseSchema = z.object({
  success: z.boolean(),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

/**
 * POST /api/superadmin/reset-context
 *
 * Resets a super admin's session back to sentinel mode (all organizations view).
 * Issues a new JWT with tenantId = "__super_admin__" and clears location scope.
 */
export const POST = createApiRoute({
  method: "POST",
  path: "/api/superadmin/reset-context",
  summary: "Reset super admin to all-orgs view",
  description: "Reissues JWT with sentinel tenantId for cross-tenant access",
  tags: ["SuperAdmin"],
  security: "adminAuth",
  responses: {
    200: responseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    try {
      const ctx = await getTenantContext()
      if (!ctx || ctx.type !== "full") {
        return { status: 401, data: { error: "Not authenticated" } }
      }

      // Only super admins can reset to sentinel mode
      if (!isSuperAdmin(ctx.role)) {
        return { status: 403, data: { error: "Super admin access required" } }
      }

      await connectDB()

      const user = await User.findById(ctx.sub).select("email name").lean()
      const email = (user as any)?.email ?? ctx.email
      const name = (user as any)?.name ?? ctx.name ?? ""

      // Issue new token with sentinel tenantId
      const token = await createFullAuthToken({
        sub: ctx.sub,
        email: String(email ?? ""),
        name: String(name ?? ""),
        tenantId: SUPER_ADMIN_SENTINEL,
        role: "super_admin",
        locations: [],
        managedRoles: [],
      })

      await setAuthCookie(token)

      return { status: 200, data: { success: true } }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[superadmin/reset-context]", err)
      }
      return { status: 500, data: { error: "Failed to reset context" } }
    }
  },
})
