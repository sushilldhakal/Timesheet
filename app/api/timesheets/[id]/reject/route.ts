import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

    const allowedRoles = ["admin", "super_admin", "manager", "supervisor"]
    if (!allowedRoles.includes(ctx.auth.role)) {
      return {
        status: 403,
        data: { error: "Only managers or admins can reject timesheets" },
      }
    }

    try {
      await connectDB()

      const timesheet = await Timesheet.findById(params!.id)
      if (!timesheet) {
        return { status: 404, data: { error: "Timesheet not found" } }
      }

      if (timesheet.status !== "submitted") {
        return {
          status: 400,
          data: {
            error: `Cannot reject timesheet in '${timesheet.status}' status. Only submitted timesheets can be rejected.`,
          },
        }
      }

      const now = new Date()
      const userId = ctx.auth.sub

      timesheet.status = "rejected"
      timesheet.rejectedBy = userId as any
      timesheet.rejectedAt = now
      timesheet.rejectionReason = body!.rejectionReason

      await timesheet.save()

      await DailyShift.updateMany(
        { _id: { $in: timesheet.shiftIds }, status: "locked" },
        { status: "approved", $unset: { lockedBy: 1, lockedAt: 1 } }
      )

      return {
        status: 200,
        data: { success: true, timesheet },
      }
    } catch (err) {
      console.error("[api/timesheets/[id]/reject POST]", err)
      return { status: 500, data: { error: "Failed to reject timesheet" } }
    }
  },
})
