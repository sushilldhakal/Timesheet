import { createApiRoute } from "@/lib/api/create-api-route"
import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { AutoRosterSuggestion } from "@/lib/db/schemas/auto-roster-suggestion"
import { z } from "zod"

const paramsSchema = z.object({ id: z.string() })

export const GET = createApiRoute({
  method: "GET",
  path: "/api/demand-forecast/roster-suggestions/{id}",
  summary: "Get roster suggestion",
  description: "Get a single auto-roster suggestion by ID",
  tags: ["Demand Forecast"],
  security: "adminAuth",
  request: { params: paramsSchema },
  responses: {
    200: z.object({ suggestion: z.any() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") return { status: 401, data: { error: "Unauthorized" } }

    await connectDB()
    const suggestion = await scope(AutoRosterSuggestion, ctx.tenantId).findById(params!.id).lean()
    if (!suggestion) return { status: 404, data: { error: "Suggestion not found" } }
    return { status: 200, data: { suggestion } }
  },
})
