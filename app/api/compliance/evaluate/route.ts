import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { complianceService } from "@/lib/services/compliance/compliance-service"
import { z } from "zod"

const bodySchema = z.object({
  employeeId: z.string(),
  shiftStart: z.string(),
  shiftEnd: z.string(),
  breakMinutes: z.number().min(0).default(0),
  shiftId: z.string().optional(),
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/compliance/evaluate",
  summary: "Ad-hoc compliance evaluation",
  description:
    "Evaluate a shift against compliance rules without persisting. Used by roster UI to show warnings before saving.",
  tags: ["Compliance"],
  security: "adminAuth",
  request: {
    body: bodySchema,
  },
  responses: {
    200: z.object({
      violations: z.array(z.any()),
      isBlocking: z.boolean(),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const result = await complianceService.evaluateShift(
      ctx,
      body!.employeeId,
      {
        employeeId: body!.employeeId,
        shiftStart: new Date(body!.shiftStart),
        shiftEnd: new Date(body!.shiftEnd),
        shiftId: body!.shiftId,
        breakMinutes: body!.breakMinutes,
      },
      { persist: false }
    )

    return { status: 200, data: result }
  },
})
