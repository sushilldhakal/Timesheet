import { createApiRoute } from "@/lib/api/create-api-route"
import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { AutoRosterSuggestion } from "@/lib/db/schemas/auto-roster-suggestion"
import { DemandForecast } from "@/lib/db/schemas/demand-forecast"
import { demandForecastService } from "@/lib/services/scheduling/demand-forecast-service"
import { resolveLocationId } from "@/lib/utils/resolve-location-id"
import { z } from "zod"

const querySchema = z.object({
  locationId: z.string().optional(),
  weekStartDate: z.string().optional(),
})

const bodySchema = z.object({
  locationId: z.string(),
  weekStartDate: z.string(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/demand-forecast/roster-suggestions",
  summary: "List roster suggestions",
  description: "Get auto-roster suggestions for a location and week",
  tags: ["Demand Forecast"],
  security: "adminAuth",
  request: { query: querySchema },
  responses: {
    200: z.object({ suggestions: z.array(z.any()) }),
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
    if (query?.weekStartDate) {
      const weekStart = new Date(query.weekStartDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      filter.date = { $gte: weekStart, $lte: weekEnd }
    }

    const suggestions = await scope(AutoRosterSuggestion, ctx.tenantId)
      .find(filter)
      .sort({ date: 1 })
      .lean()
    return { status: 200, data: { suggestions } }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/demand-forecast/roster-suggestions",
  summary: "Generate roster suggestions",
  description: "Generate auto-roster suggestions for a location and week based on demand forecasts",
  tags: ["Demand Forecast"],
  security: "adminAuth",
  request: { body: bodySchema },
  responses: {
    200: z.object({ suggestions: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") return { status: 401, data: { error: "Unauthorized" } }

    await connectDB()

    const resolvedLocationId = await resolveLocationId(body!.locationId)
    if (!resolvedLocationId) {
      return { status: 400, data: { error: `Location not found: ${body!.locationId}` } }
    }

    const weekStart = new Date(body!.weekStartDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Find forecasts for this location + week
    const forecasts = await scope(DemandForecast, ctx.tenantId)
      .find({
        locationId: resolvedLocationId,
        date: { $gte: weekStart, $lte: weekEnd },
      })
      .lean()

    if (forecasts.length === 0) {
      return { status: 404, data: { error: "No forecasts found for this location and week. Generate forecasts first." } }
    }

    const allSuggestions = []
    for (const forecast of forecasts) {
      const suggestions = await demandForecastService.generateRosterSuggestions(
        ctx,
        (forecast as any)._id.toString()
      )
      allSuggestions.push(...suggestions)
    }

    return { status: 200, data: { suggestions: allSuggestions } }
  },
})
