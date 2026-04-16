import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { timesheetApprovalsService } from "@/lib/services/timesheet/timesheet-approvals-service"

const submitSchema = z.object({
  submissionNotes: z.string().optional(),
})

const paramsSchema = z.object({ id: z.string() })

export const POST = createApiRoute({
  method: "POST",
  path: "/api/timesheets/[id]/submit",
  summary: "Submit timesheet for approval",
  description:
    "Transition timesheet from draft to submitted. Requires at least 1 linked shift with approved/completed status.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: paramsSchema, body: submitSchema },
  responses: {
    200: z.object({ success: z.boolean(), timesheet: z.any() }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    return await timesheetApprovalsService.submit(ctx, params!.id, body)
  },
})
