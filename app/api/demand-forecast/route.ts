import { createApiRoute } from "@/lib/api/create-api-route"
import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { DemandForecast } from "@/lib/db/schemas/demand-forecast"
import { demandForecastService } from "@/lib/services/scheduling/demand-forecast-service"
import { resolveLocationId } from "@/lib/utils/resolve-location-id"
import { z } from "zod"

const querySchema = z.object({
  locationId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const bodySchema = z.object({
  locationId: z.string(),
  targetDate: z.string(),
  historicalWeeks: z.number().min(1).max(52).optional().default(8),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/demand-forecast",
  summary: "List demand forecasts",
  description: "Get demand forecasts for a location and date range",
  tags: ["Demand Forecast"],
  security: "adminAuth",
  request: { query: querySchema },
  responses: {
    200: z.object({ forecasts: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") return { status: 401, data: { error: "Unauthorized" } }

    await connectDB()
    const filter: Record<string, unknown> = {}
    if (query?.locationId) {
      const resolvedId = await resolveLocationId(query.locationId)
      if (resolvedId) filter.locationId = resolvedId
    }
    if (query?.startDate || query?.endDate) {
      filter.date = {}
      if (query?.startDate) (filter.date as any).$gte = new Date(query.startDate)
      if (query?.endDate) (filter.date as any).$lte = new Date(query.endDate)
    }

    const forecasts = await scope(DemandForecast, ctx.tenantId).find(filter).sort({ date: 1 }).lean()
    return { status: 200, data: { forecasts } }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/demand-forecast",
  summary: "Generate demand forecast",
  description: "Generate demand forecasts for a location starting from a target date",
  tags: ["Demand Forecast"],
  security: "adminAuth",
  request: { body: bodySchema },
  responses: {
    200: z.object({ forecasts: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") return { status: 401, data: { error: "Unauthorized" } }

    const resolvedLocationId = await resolveLocationId(body!.locationId)
    if (!resolvedLocationId) {
      return { status: 400, data: { error: `Location not found: ${body!.locationId}` } }
    }

    const forecasts = await demandForecastService.generateForecast(
      ctx,
      resolvedLocationId,
      new Date(body!.targetDate),
      body!.historicalWeeks ?? 8
    )
    return { status: 200, data: { forecasts } }
  },
})
