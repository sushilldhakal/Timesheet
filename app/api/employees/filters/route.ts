import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { z } from "zod"
import { employeeFiltersService } from "@/lib/services/employee/employee-filters-service"

const employeeFiltersResponseSchema = z.object({
  roles: z.array(z.object({
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

/** GET /api/employees/filters - Get filter options with counts for employees */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/filters',
  summary: 'Get employee filter options',
  description: 'Get available filter options with employee counts for roles, employers, and locations',
  tags: ['Employees'],
  security: 'adminAuth',
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

    return {
      status: 200,
      data: await employeeFiltersService.getFilters(ctx)
    }
  }
})