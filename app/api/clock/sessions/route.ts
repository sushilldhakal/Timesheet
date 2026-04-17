import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { ClockSession } from "@/lib/db/schemas/clock-session"
import { z } from "zod"

export const GET = createApiRoute({
  method: "GET",
  path: "/api/clock/sessions",
  summary: "List active clock sessions",
  description: "Get all currently active clock sessions for the tenant (who is clocked in right now)",
  tags: ["Clock"],
  security: "adminAuth",
  responses: {
    200: z.object({ sessions: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await connectDB()

    const sessions = await scope(ClockSession, ctx.tenantId)
      .find({ isActive: true })
      .sort({ loginTime: -1 })
      .lean()

    return { status: 200, data: { sessions } }
  },
})
