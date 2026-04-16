import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { timesheetApprovalsService } from "@/lib/services/timesheet/timesheet-approvals-service"

const querySchema = z.object({
  tenantId: z.string().optional(),
  employeeId: z.string().optional(),
  status: z
    .enum(["draft", "submitted", "approved", "rejected", "locked"])
    .optional(),
  payPeriodStart: z.string().optional(),
  payPeriodEnd: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/timesheets/approvals",
  summary: "List timesheet approval records",
  description:
    "List all Timesheet model documents (approval workflow) with filtering and pagination",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { query: querySchema },
  responses: {
    200: z.object({
      timesheets: z.array(z.any()),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    return {
      status: 200,
      data: await timesheetApprovalsService.list(ctx, query),
    }
  },
})
