import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { rosterWeekTemplateService } from "@/lib/services/scheduling/roster-week-template-service"

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

    try {
      return await rosterWeekTemplateService.deleteTemplate({ ctx, id })
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
