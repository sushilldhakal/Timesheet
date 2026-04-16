import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { timesheetApprovalsService } from "@/lib/services/timesheet/timesheet-approvals-service"

const lockSchema = z.object({
  payRunId: z.string().min(1, "payRunId is required"),
})

const paramsSchema = z.object({ id: z.string() })

export const POST = createApiRoute({
  method: "POST",
  path: "/api/timesheets/[id]/lock",
  summary: "Lock an approved timesheet for payrun",
  description:
    "Transition timesheet from approved to locked. Links to a PayRun and prevents any further changes to the timesheet or its shifts.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: paramsSchema, body: lockSchema },
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

    return await timesheetApprovalsService.lock(ctx, params!.id, body)
  },
})
