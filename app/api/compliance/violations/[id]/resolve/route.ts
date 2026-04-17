import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { complianceService } from "@/lib/services/compliance/compliance-service"
import { z } from "zod"

const bodySchema = z.object({
  action: z.enum(["manual_override", "shift_edited", "auto_resolved"]),
  notes: z.string().optional(),
})

const paramsSchema = z.object({
  id: z.string(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/compliance/violations/{id}/resolve",
  summary: "Resolve a compliance violation",
  description: "Mark a compliance violation as resolved with a resolution action",
  tags: ["Compliance"],
  security: "adminAuth",
  request: {
    body: bodySchema,
    params: paramsSchema,
  },
  responses: {
    200: z.object({ message: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body, params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await complianceService.resolveViolation(
      ctx,
      params!.id,
      body!.action,
      ctx.sub
    )

    return { status: 200, data: { message: "Violation resolved" } }
  },
})
