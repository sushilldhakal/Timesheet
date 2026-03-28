import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { assertManagerSchedulingScope, assertUserLocationAccess } from "@/lib/auth/scheduling-scope"
import { connectDB } from "@/lib/db"
import { SchedulingTemplateManager } from "@/lib/managers/scheduling-template-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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
      await connectDB()
      const mgr = new SchedulingTemplateManager()
      const isAdmin = ctx.auth.role === "admin" || ctx.auth.role === "super_admin"
      const templates = await mgr.listForUser(ctx.auth.sub, isAdmin)
      return { status: 200, data: { templates } }
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

    const roleIds = body.roleIds ?? []
    const locOk = await assertUserLocationAccess(ctx, body.locationId)
    if (!locOk.ok) {
      return { status: locOk.status, data: { error: locOk.error } }
    }
    if (roleIds.length > 0) {
      const scope = await assertManagerSchedulingScope(ctx, body.locationId, roleIds)
      if (!scope.ok) {
        return { status: scope.status, data: { error: scope.error } }
      }
    }

    const isAdmin = ctx.auth.role === "admin" || ctx.auth.role === "super_admin"
    if (body.isGlobal && !isAdmin) {
      return { status: 403, data: { error: "Only admins can create global templates" } }
    }

    try {
      await connectDB()
      const mgr = new SchedulingTemplateManager()
      const template = await mgr.createFromWeek({
        name: body.name,
        weekId: body.weekId,
        locationId: body.locationId,
        roleIds,
        createdBy: ctx.auth.sub,
        isGlobal: body.isGlobal,
      })
      return { status: 201, data: { template } }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed"
      console.error("[scheduling/templates POST]", e)
      return { status: 500, data: { error: msg } }
    }
  },
})
