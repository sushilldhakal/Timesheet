import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { timesheetApprovalsService } from "@/lib/services/timesheet/timesheet-approvals-service"

const approveSchema = z.object({
  notes: z.string().optional(),
})

const paramsSchema = z.object({ id: z.string() })

export const POST = createApiRoute({
  method: "POST",
  path: "/api/timesheets/[id]/approve",
  summary: "Approve a submitted timesheet",
  description:
    "Transition timesheet from submitted to approved. Locks all linked shifts. Requires manager/admin role.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: paramsSchema, body: approveSchema },
  responses: {
    200: z.object({
      success: z.boolean(),
      timesheet: z.any(),
      lockedShifts: z.number(),
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

    return await timesheetApprovalsService.approve(ctx, params!.id, body)
  },
})
