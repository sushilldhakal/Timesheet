import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { connectDB } from "@/lib/db"
import { Employer } from "@/lib/db/schemas/employer"
import { UserTenant } from "@/lib/db/schemas/user-tenant"
import { getPreAuthFromCookie } from "@/lib/auth/tenant-context"

const orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

const orgsResponseSchema = z.object({
  orgs: z.array(orgSchema),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/auth/orgs",
  summary: "List orgs for pre-auth user",
  description: "Returns available organisations for a user after password verification",
  tags: ["Auth"],
  security: "none",
  responses: {
    200: orgsResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    try {
      const preauth = await getPreAuthFromCookie()
      if (!preauth || preauth.type !== "preauth") {
        return { status: 401, data: { error: "Not authenticated" } }
      }

      await connectDB()

      const memberships = await UserTenant.find({ userId: preauth.sub, isActive: true })
        .select("tenantId")
        .lean()
      const tenantIds = memberships.map((m: any) => String(m.tenantId))
      if (tenantIds.length === 0) {
        return { status: 200, data: { orgs: [] } }
      }

      const employers = await Employer.find({ _id: { $in: tenantIds } }).select("name").lean()
      const employersById = new Map(employers.map((e: any) => [String((e as any)._id), e]))

      return {
        status: 200,
        data: {
          orgs: tenantIds
            .map((id) => {
              const employer = employersById.get(id) as any
              if (!employer) return null
              const name = String(employer.name ?? "")
              const slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
              return { id, name, slug }
            })
            .filter(Boolean),
        },
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[auth/orgs]", err)
      }
      return { status: 500, data: { error: "Failed to list orgs" } }
    }
  },
})

