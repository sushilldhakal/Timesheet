import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { complianceService } from "@/lib/services/compliance/compliance-service"
import { z } from "zod"

const querySchema = z.object({
  employeeId: z.string().optional(),
  severity: z.enum(["warning", "breach"]).optional(),
  from: z.string().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/compliance/violations",
  summary: "List compliance violations",
  description: "Get active compliance violations for the tenant, with optional filters",
  tags: ["Compliance"],
  security: "adminAuth",
  request: {
    query: querySchema,
  },
  responses: {
    200: z.object({ violations: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const violations = await complianceService.getViolations(ctx, {
      employeeId: query?.employeeId,
      severity: query?.severity,
      fromDate: query?.from ? new Date(query.from) : undefined,
    })

    return { status: 200, data: { violations } }
  },
})
