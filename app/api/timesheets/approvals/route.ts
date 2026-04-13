import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

    const { tenantId, employeeId, status, payPeriodStart, payPeriodEnd, page, limit } =
      query || {}

    try {
      await connectDB()

      const filter: Record<string, unknown> = {
        tenantId: tenantId || ctx.tenantId,
      }

      if (employeeId) filter.employeeId = employeeId
      if (status) filter.status = status
      if (payPeriodStart) filter.payPeriodStart = { $gte: new Date(payPeriodStart) }
      if (payPeriodEnd) filter.payPeriodEnd = { $lte: new Date(payPeriodEnd) }

      const skip = ((page ?? 1) - 1) * (limit ?? 50)

      const [timesheets, total] = await Promise.all([
        Timesheet.find(filter)
          .populate("employeeId", "name pin email")
          .populate("submittedBy", "email")
          .populate("approvedBy", "email")
          .populate("rejectedBy", "email")
          .populate("lockedBy", "email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit ?? 50)
          .lean(),
        Timesheet.countDocuments(filter),
      ])

      return {
        status: 200,
        data: {
          timesheets,
          total,
          page: page ?? 1,
          limit: limit ?? 50,
          totalPages: Math.ceil(total / (limit ?? 50)),
        },
      }
    } catch (err) {
      console.error("[api/timesheets/approvals GET]", err)
      return { status: 500, data: { error: "Failed to fetch timesheet approvals" } }
    }
  },
})
