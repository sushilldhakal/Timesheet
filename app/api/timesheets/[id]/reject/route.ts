import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { timesheetApprovalsService } from "@/lib/services/timesheet/timesheet-approvals-service"

const rejectSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
})

const paramsSchema = z.object({ id: z.string() })

export const POST = createApiRoute({
  method: "POST",
  path: "/api/timesheets/[id]/reject",
  summary: "Reject a submitted timesheet",
  description:
    "Transition timesheet from submitted to rejected. Reverts linked shift statuses to approved so the employee can fix issues and resubmit.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: paramsSchema, body: rejectSchema },
  responses: {
    200: z.object({
      success: z.boolean(),
      timesheet: z.any(),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    return await timesheetApprovalsService.reject(ctx, params!.id, body)
  },
})
