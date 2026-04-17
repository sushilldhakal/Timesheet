import { createApiRoute } from "@/lib/api/create-api-route"
import { resolveTenantContext } from "@/lib/auth/resolve-tenant-context"
import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { DemandForecast } from "@/lib/db/schemas/demand-forecast"
import { z } from "zod"

const paramsSchema = z.object({ id: z.string() })

export const GET = createApiRoute({
  method: "GET",
  path: "/api/demand-forecast/{id}",
  summary: "Get demand forecast",
  description: "Get a single demand forecast by ID",
  tags: ["Demand Forecast"],
  security: "adminAuth",
  request: { params: paramsSchema },
  responses: {
    200: z.object({ forecast: z.any() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, req }) => {
    const ctx = await resolveTenantContext(req)
    if (!ctx || ctx.type !== "full") return { status: 401, data: { error: "Unauthorized" } }

    await connectDB()
    const forecast = await scope(DemandForecast, ctx.tenantId).findById(params!.id).lean()
    if (!forecast) return { status: 404, data: { error: "Forecast not found" } }
    return { status: 200, data: { forecast } }
  },
})
