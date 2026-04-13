import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

    try {
      await connectDB()

      const timesheet = await Timesheet.findById(params!.id)
      if (!timesheet) {
        return { status: 404, data: { error: "Timesheet not found" } }
      }

      if (timesheet.status !== "draft") {
        return {
          status: 400,
          data: {
            error: `Cannot submit timesheet in '${timesheet.status}' status. Only draft timesheets can be submitted.`,
          },
        }
      }

      if (!timesheet.shiftIds || timesheet.shiftIds.length === 0) {
        return {
          status: 400,
          data: { error: "Cannot submit timesheet with no linked shifts" },
        }
      }

      const invalidShifts = await DailyShift.countDocuments({
        _id: { $in: timesheet.shiftIds },
        status: { $nin: ["approved", "completed"] },
      })

      if (invalidShifts > 0) {
        return {
          status: 400,
          data: {
            error: `${invalidShifts} shift(s) are not in approved/completed status. All shifts must be approved or completed before submission.`,
          },
        }
      }

      timesheet.status = "submitted"
      timesheet.submittedBy = ctx.auth.sub as any
      timesheet.submittedAt = new Date()
      if (body?.submissionNotes) {
        timesheet.submissionNotes = body.submissionNotes
      }

      await timesheet.save()

      return { status: 200, data: { success: true, timesheet } }
    } catch (err) {
      console.error("[api/timesheets/[id]/submit POST]", err)
      return { status: 500, data: { error: "Failed to submit timesheet" } }
    }
  },
})
