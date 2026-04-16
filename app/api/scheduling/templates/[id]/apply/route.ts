import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope, assertUserLocationAccess } from "@/lib/auth/scheduling-scope"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { rosterWeekTemplateService } from "@/lib/services/scheduling/roster-week-template-service"

const idParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid template id"),
})

const applyBodySchema = z.object({
  targetWeekId: z.string().regex(/^\d{4}-W\d{2}$/),
  mode: z.enum(["add", "replace"]),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  roleIds: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)).optional().default([]),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/scheduling/templates/{id}/apply",
  summary: "Apply roster template to a week",
  tags: ["scheduling"],
  security: "adminAuth",
  request: {
    params: idParamSchema,
    body: applyBodySchema,
  },
  responses: {
    200: z.object({ shiftsCreated: z.number() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!params || !body) {
      return { status: 400, data: { error: "Invalid request" } }
    }

    try {
      return await rosterWeekTemplateService.applyTemplate({
        ctx,
        templateId: params.id,
        body,
        assertUserLocationAccess,
        assertManagerSchedulingScope,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to apply template"
      console.error("[scheduling/templates/apply POST]", e)
      return { status: 500, data: { error: msg } }
    }
  },
})
