import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope, assertUserLocationAccess } from "@/lib/auth/scheduling-scope"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { rosterWeekTemplateService } from "@/lib/services/scheduling/roster-week-template-service"

const createBodySchema = z.object({
  name: z.string().min(1).max(200),
  weekId: z.string().regex(/^\d{4}-W\d{2}$/),
  locationId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  roleIds: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)).optional().default([]),
  isGlobal: z.boolean().optional().default(false),
})

const templateSchema = z.any()

export const GET = createApiRoute({
  method: "GET",
  path: "/api/scheduling/templates",
  summary: "List roster week templates",
  tags: ["scheduling"],
  security: "adminAuth",
  responses: {
    200: z.object({ templates: z.array(templateSchema) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return { status: 200, data: await rosterWeekTemplateService.listForUser(ctx) }
    } catch (e) {
      console.error("[scheduling/templates GET]", e)
      return { status: 500, data: { error: "Failed to list templates" } }
    }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/scheduling/templates",
  summary: "Save week as roster template",
  tags: ["scheduling"],
  security: "adminAuth",
  request: { body: createBodySchema },
  responses: {
    201: z.object({ template: templateSchema }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!body) {
      return { status: 400, data: { error: "Body required" } }
    }

    try {
      return await rosterWeekTemplateService.createFromWeek({
        ctx,
        body,
        assertUserLocationAccess,
        assertManagerSchedulingScope,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed"
      console.error("[scheduling/templates POST]", e)
      return { status: 500, data: { error: msg } }
    }
  },
})
