import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { z } from "zod"
import { employeeFiltersService } from "@/lib/services/employee/employee-filters-service"
import { objectIdSchema } from "@/lib/validations/common"

const employeeFiltersResponseSchema = z.object({
  teams: z.array(z.object({
    name: z.string(),
    count: z.number()
  })),
  employers: z.array(z.object({
    name: z.string(),
    count: z.number()
  })),
  locations: z.array(z.object({
    name: z.string(),
    count: z.number()
  }))
})

const employeeFiltersQuerySchema = z.object({
  // Supports single ObjectId or comma-separated list (multi-location scope)
  locationId: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v) return true
        const parts = v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        if (parts.length === 0) return true
        return parts.every((id) => /^[0-9a-fA-F]{24}$/.test(id))
      },
      { message: "Invalid MongoDB ObjectId" }
    ),
  // Back-compat (deprecated): location name
  location: z.string().optional(),
})

/** GET /api/employees/filters - Get filter options with counts for employees */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/filters',
  summary: 'Get employee filter options',
  description: 'Get available filter options with employee counts for teams, employers, and locations',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    query: employeeFiltersQuerySchema,
  },
  responses: {
    200: employeeFiltersResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { locationId, location } = data.query || {}

    return {
      status: 200,
      data: await employeeFiltersService.getFilters(ctx, { locationId: locationId || undefined, locationName: location || undefined })
    }
  }
})
