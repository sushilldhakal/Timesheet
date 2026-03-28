import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { SchedulingTemplateManager } from "@/lib/managers/scheduling-template-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

const idParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid template id"),
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/scheduling/templates/{id}",
  summary: "Delete roster template",
  tags: ["scheduling"],
  security: "adminAuth",
  request: { params: idParamSchema },
  responses: {
    200: z.object({ ok: z.boolean() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const id = params!.id
    const isAdmin = ctx.auth.role === "admin" || ctx.auth.role === "super_admin"

    try {
      await connectDB()
      const mgr = new SchedulingTemplateManager()
      const { deleted } = await mgr.deleteTemplate(id, ctx.auth.sub, isAdmin)
      if (!deleted) {
        return { status: 404, data: { error: "Not found" } }
      }
      return { status: 200, data: { ok: true } }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed"
      if (msg === "Forbidden") {
        return { status: 403, data: { error: msg } }
      }
      console.error("[scheduling/templates DELETE]", e)
      return { status: 500, data: { error: msg } }
    }
  },
})
