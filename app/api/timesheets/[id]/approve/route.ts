import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

    const allowedRoles = ["admin", "super_admin", "manager", "supervisor"]
    if (!allowedRoles.includes(ctx.auth.role)) {
      return {
        status: 403,
        data: { error: "Only managers or admins can approve timesheets" },
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
            error: `Cannot approve timesheet in '${timesheet.status}' status. Only submitted timesheets can be approved.`,
          },
        }
      }

      const now = new Date()
      const userId = ctx.auth.sub

      timesheet.status = "approved"
      timesheet.approvedBy = userId as any
      timesheet.approvedAt = now
      if (body?.notes) timesheet.notes = body.notes

      await timesheet.save()

      const lockResult = await DailyShift.updateMany(
        { _id: { $in: timesheet.shiftIds } },
        { status: "locked", lockedBy: userId, lockedAt: now }
      )

      return {
        status: 200,
        data: {
          success: true,
          timesheet,
          lockedShifts: lockResult.modifiedCount,
        },
      }
    } catch (err) {
      console.error("[api/timesheets/[id]/approve POST]", err)
      return { status: 500, data: { error: "Failed to approve timesheet" } }
    }
  },
})
