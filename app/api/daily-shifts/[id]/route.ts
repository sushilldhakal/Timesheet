import { z } from "zod"
import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { editShift } from "@/lib/services/shift-service"

const paramsSchema = z.object({ id: z.string() })

const breakSchema = z.object({
  startTimeUtc: z.string(),
  endTimeUtc: z.string(),
  isPaid: z.boolean().optional(),
  source: z.enum(["clocked", "automatic"]).optional(),
})

const patchSchema = z.object({
  clockInUtc: z.string().nullable().optional(),
  clockOutUtc: z.string().nullable().optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  breaks: z.array(breakSchema).nullable().optional(),
  awardTags: z.array(z.string().trim()).nullable().optional(),
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/daily-shifts/[id]",
  summary: "Edit a daily shift (times/breaks)",
  description: "Edits clock-in/out and breaks for a DailyShift. Recalculates totals and wage cost, and writes an audit log.",
  tags: ["DailyShifts"],
  security: "adminAuth",
  request: { params: paramsSchema, body: patchSchema },
  responses: {
    200: z.object({ success: z.boolean(), shift: z.any() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body, req }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const actor = {
      userId: String(ctx.auth.sub),
      role: String(ctx.auth.role),
      tenantId: String(ctx.tenantId),
      userLocations: ctx.userLocations,
      managedRoles: ctx.managedRoles,
    }

    const res = await editShift(params!.id, body!, actor, {
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    })
    return { status: 200, data: res }
  },
})

