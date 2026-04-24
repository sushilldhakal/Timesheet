import { z } from "zod"
import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { rejectShift } from "@/lib/services/shift/shift-service"

const paramsSchema = z.object({ id: z.string() })

export const POST = createApiRoute({
  method: "POST",
  path: "/api/daily-shifts/[id]/reject",
  summary: "Reject a daily shift",
  description: "Marks a DailyShift as rejected and records the action with audit logging.",
  tags: ["DailyShifts"],
  security: "adminAuth",
  request: { params: paramsSchema, body: z.object({ reason: z.string().optional() }).optional() },
  responses: {
    200: z.object({ success: z.boolean(), shift: z.any() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, req }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const actor = {
      userId: String(ctx.auth.sub),
      role: String(ctx.auth.role),
      tenantId: String(ctx.tenantId),
      userLocations: ctx.userLocations,
      managedRoles: ctx.managedRoles,
    }

    const res = await rejectShift(params!.id, actor, {
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      reason: body?.reason,
    })
    return { status: 200, data: res }
  },
})
