import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { z } from "zod"
import { errorResponseSchema } from "@/lib/validations/auth"
import { availabilityService } from "@/lib/services/availability/availability-service"

const bulkQuerySchema = z.object({
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid start date"),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid end date"),
  location: z.array(z.string()).optional(),
})

/**
 * GET /api/employees/availability/bulk?location=Name1&location=Name2
 * Returns all availability constraints scoped to the given locations (or all if omitted).
 */
export const GET = createApiRoute({
  method: "GET",
  path: "/api/employees/availability/bulk",
  summary: "Bulk availability constraints",
  description: "Get all availability constraints, optionally filtered by location names",
  tags: ["Employees"],
  security: "adminAuth",
  request: { query: bulkQuerySchema },
  responses: {
    200: z.object({ constraints: z.array(z.any()) }),
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    try {
      const result = await availabilityService.listBulk({
        tenantId: ctx.tenantId,
        location: query?.location,
        startDate: query?.startDate,
        endDate: query?.endDate,
      })
      return { status: 200, data: result }
    } catch (err) {
      console.error("[availability/bulk GET]", err)
      return { status: 500, data: { error: "Failed to fetch availability constraints" } }
    }
  },
})
