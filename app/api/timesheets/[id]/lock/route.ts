import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import mongoose from "mongoose"

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

    const allowedRoles = ["admin", "super_admin", "accounts"]
    if (!allowedRoles.includes(ctx.auth.role)) {
      return {
        status: 403,
        data: { error: "Only payroll admins can lock timesheets" },
      }
    }

    try {
      await connectDB()

      const { payRunId } = body!

      if (!mongoose.Types.ObjectId.isValid(payRunId)) {
        return { status: 400, data: { error: "Invalid payRunId" } }
      }

      const payRun = await PayRun.findById(payRunId)
      if (!payRun) {
        return { status: 404, data: { error: "PayRun not found" } }
      }

      const timesheet = await Timesheet.findById(params!.id)
      if (!timesheet) {
        return { status: 404, data: { error: "Timesheet not found" } }
      }

      if (timesheet.status !== "approved") {
        return {
          status: 400,
          data: {
            error: `Cannot lock timesheet in '${timesheet.status}' status. Only approved timesheets can be locked.`,
          },
        }
      }

      const now = new Date()
      const userId = ctx.auth.sub

      timesheet.status = "locked"
      timesheet.lockedBy = userId as any
      timesheet.lockedAt = now
      timesheet.payRunId = payRunId as any

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
      console.error("[api/timesheets/[id]/lock POST]", err)
      return { status: 500, data: { error: "Failed to lock timesheet" } }
    }
  },
})
