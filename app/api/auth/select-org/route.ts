import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { connectDB, User } from "@/lib/db"
import { UserTenant } from "@/lib/db/schemas/user-tenant"
import { setAuthCookie } from "@/lib/auth/auth-helpers"
import {
  clearPreAuthCookie,
  createFullAuthToken,
  getPreAuthFromCookie,
} from "@/lib/auth/tenant-context"

const requestSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
})

const responseSchema = z.object({
  success: z.boolean(),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/auth/select-org",
  summary: "Select organisation",
  description: "Selects an organisation and issues a full JWT session cookie",
  tags: ["Auth"],
  security: "none",
  request: { body: requestSchema },
  responses: {
    200: responseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const preauth = await getPreAuthFromCookie()
      if (!preauth || preauth.type !== "preauth") {
        return { status: 401, data: { error: "Not authenticated" } }
      }

      if (!body) return { status: 400, data: { error: "Request body is required" } }
      const { tenantId } = body as any

      await connectDB()

      const membership = await UserTenant.findOne({
        userId: preauth.sub,
        tenantId,
        isActive: true,
      })
        .select("tenantId role location managedRoles")
        .lean()

      if (!membership) {
        return { status: 401, data: { error: "Not a member of this organisation" } }
      }

      const user = await User.findById(preauth.sub).select("email name").lean()
      const email = (user as any)?.email ?? preauth.email
      const name = (user as any)?.name ?? preauth.name ?? ""

      const locations = Array.isArray((membership as any).location)
        ? ((membership as any).location as any[]).map(String).filter(Boolean)
        : []
      const managedRoles = Array.isArray((membership as any).managedRoles)
        ? ((membership as any).managedRoles as any[]).map(String).filter(Boolean)
        : []

      const token = await createFullAuthToken({
        sub: String(preauth.sub),
        email: String(email ?? ""),
        name: String(name ?? ""),
        tenantId: String((membership as any).tenantId),
        role: String((membership as any).role ?? "user"),
        locations,
        managedRoles,
      })

      await setAuthCookie(token)
      await clearPreAuthCookie()

      return { status: 200, data: { success: true } }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/select-org]", err)
      }
      return { status: 500, data: { error: "Failed to select organisation" } }
    }
  },
})

