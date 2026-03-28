import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope, assertUserLocationAccess } from "@/lib/auth/scheduling-scope"
import { connectDB } from "@/lib/db"
import { SchedulingTemplateManager } from "@/lib/managers/scheduling-template-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

    const locOk = await assertUserLocationAccess(ctx, body.locationId)
    if (!locOk.ok) {
      return { status: locOk.status, data: { error: locOk.error } }
    }

    const roleIds = body.roleIds ?? []
    if (roleIds.length > 0) {
      const scope = await assertManagerSchedulingScope(ctx, body.locationId, roleIds)
      if (!scope.ok) {
        return { status: scope.status, data: { error: scope.error } }
      }
    }

    try {
      await connectDB()
      const mgr = new SchedulingTemplateManager()
      const result = await mgr.applyTemplate({
        templateId: params.id,
        targetWeekId: body.targetWeekId,
        mode: body.mode,
        locationId: body.locationId,
        roleIds,
      })
      return { status: 200, data: result }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to apply template"
      console.error("[scheduling/templates/apply POST]", e)
      return { status: 500, data: { error: msg } }
    }
  },
})
