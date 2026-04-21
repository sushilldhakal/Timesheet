import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { connectDB, Employer } from "@/lib/db"
import { isSuperAdminAuth } from "@/lib/auth/auth-api"
import { getTenantContext } from "@/lib/auth/tenant-context"
import { isSuperAdmin } from "@/lib/config/roles"

const responseSchema = z.object({
  orgs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
  ),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

/**
 * GET /api/superadmin/orgs
 *
 * Returns all active organizations in the system.
 * Only accessible to super admins (either in sentinel mode or with super_admin role).
 */
export const GET = createApiRoute({
  method: "GET",
  path: "/api/superadmin/orgs",
  summary: "List all organizations (super admin only)",
  description: "Returns all active organizations for super admin org selection",
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

      // Allow access if user is in super admin sentinel mode OR has super_admin role
      const hasAccess = (ctx.role === "super_admin" && ctx.tenantId === "__super_admin__") || isSuperAdmin(ctx.role as any)
      if (!hasAccess) {
        return { status: 403, data: { error: "Super admin access required" } }
      }

      await connectDB()

      // Fetch all active employers
      const employers = await Employer.find({ isActive: true })
        .select("_id name slug")
        .sort({ name: 1 })
        .lean()

      const orgs = (employers as any[]).map((emp) => ({
        id: String(emp._id),
        name: emp.name ?? "",
        slug: emp.slug ?? "",
      }))

      return { status: 200, data: { orgs } }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[superadmin/orgs]", err)
      }
      return { status: 500, data: { error: "Failed to fetch organizations" } }
    }
  },
})
