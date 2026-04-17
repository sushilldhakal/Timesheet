import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { labourCostService } from "@/lib/services/analytics/labour-cost-service"
import { resolveLocationId } from "@/lib/utils/resolve-location-id"
import { z } from "zod"

const querySchema = z.object({
  locationId: z.string(),
  from: z.string(),
  to: z.string(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/analytics/labour-cost",
  summary: "Get labour cost analysis",
  description: "Get daily labour cost breakdown for a location over a date range",
  tags: ["Analytics"],
  security: "adminAuth",
  request: {
    query: querySchema,
  },
  responses: {
    200: z.object({ breakdown: z.array(z.any()) }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!query?.locationId || !query.from || !query.to) {
      return { status: 400, data: { error: "locationId, from, and to are required" } }
    }

    const resolvedLocationId = await resolveLocationId(query.locationId)
    if (!resolvedLocationId) {
      return { status: 400, data: { error: `Location not found: ${query.locationId}` } }
    }

    const breakdown = await labourCostService.getDailyBreakdown(
      ctx,
      resolvedLocationId,
      new Date(query.from),
      new Date(query.to)
    )

    return { status: 200, data: { breakdown } }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/analytics/labour-cost",
  summary: "Generate labour cost analysis",
  description: "Generate or regenerate a labour cost analysis for a location and period",
  tags: ["Analytics"],
  security: "adminAuth",
  request: {
    query: querySchema,
  },
  responses: {
    200: z.object({ analysis: z.any() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!query?.locationId || !query.from || !query.to) {
      return { status: 400, data: { error: "locationId, from, and to are required" } }
    }

    const resolvedLocationId = await resolveLocationId(query.locationId)
    if (!resolvedLocationId) {
      return { status: 400, data: { error: `Location not found: ${query.locationId}` } }
    }

    const analysis = await labourCostService.generateAnalysis(
      ctx,
      resolvedLocationId,
      new Date(query.from),
      new Date(query.to)
    )

    return { status: 200, data: { analysis } }
  },
})
