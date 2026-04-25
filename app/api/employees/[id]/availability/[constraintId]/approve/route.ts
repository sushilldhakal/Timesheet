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
  comment: z.string().optional(),
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/employees/{id}/availability/{constraintId}/approve",
  summary: "Approve availability constraint",
  tags: ["Employees"],
  security: "adminAuth",
  request: { params: paramsSchema, body: bodySchema },
  responses: {
    200: z.object({ constraint: z.any() }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    try {
      const result = await availabilityService.approveConstraint({
        constraintId: params!.constraintId,
        tenantId: ctx.tenantId,
        approverId: ctx.auth.sub,
        comment: body?.comment,
      })
      return { status: 200, data: result }
    } catch (err: any) {
      if (err?.statusCode === 404) return { status: 404, data: { error: "Constraint not found" } }
      console.error("[availability approve]", err)
      return { status: 500, data: { error: "Failed to approve constraint" } }
    }
  },
})
