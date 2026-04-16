import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import {
  absencesBulkQuerySchema,
  absencesBulkListResponseSchema,
} from "@/lib/validations/absences"
import { errorResponseSchema } from "@/lib/validations/auth"
import { absenceService } from "@/lib/services/absence/absence-service"

/**
 * GET /api/absences?startDate=&endDate=&employeeId=...&status=&leaveType=&limit=&offset=
 * List leave records across employees (single DB query).
 */
export const GET = createApiRoute({
  method: "GET",
  path: "/api/absences",
  summary: "List absences (bulk)",
  description: "Query leave records across employees with optional filters and pagination",
  tags: ["Absences"],
  security: "adminAuth",
  request: {
    query: absencesBulkQuerySchema,
  },
  responses: {
    200: absencesBulkListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!query) {
      return { status: 400, data: { error: "Query parameters are required" } }
    }

    const result = await absenceService.listBulk(query)
    return { status: 200, data: result }
  },
})
