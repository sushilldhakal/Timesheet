import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { z } from "zod"
import { errorResponseSchema } from "@/lib/validations/auth"
import { availabilityService } from "@/lib/services/availability/availability-service"

const paramsSchema = z.object({
  id: z.string(),
  constraintId: z.string(),
})

const bodySchema = z.object({
  reason: z.string().min(1, "Decline reason is required"),
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/employees/{id}/availability/{constraintId}/decline",
  summary: "Decline availability constraint",
  tags: ["Employees"],
  security: "adminAuth",
  request: { params: paramsSchema, body: bodySchema },
  responses: {
    200: z.object({ constraint: z.any() }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!body?.reason?.trim()) return { status: 400, data: { error: "Decline reason is required" } }
    try {
      const result = await availabilityService.declineConstraint({
        constraintId: params!.constraintId,
        tenantId: ctx.tenantId,
        declinerId: ctx.auth.sub,
        reason: body.reason,
      })
      return { status: 200, data: result }
    } catch (err: any) {
      if (err?.statusCode === 404) return { status: 404, data: { error: "Constraint not found" } }
      console.error("[availability decline]", err)
      return { status: 500, data: { error: "Failed to decline constraint" } }
    }
  },
})
