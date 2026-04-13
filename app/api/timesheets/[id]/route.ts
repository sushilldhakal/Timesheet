import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { Timesheet } from "@/lib/db/schemas/timesheet"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Employee } from "@/lib/db/schemas/employee"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

const idParamsSchema = z.object({ id: z.string() })

export const GET = createApiRoute({
  method: "GET",
  path: "/api/timesheets/[id]",
  summary: "Get timesheet by ID",
  description: "Get a single timesheet with populated shifts and employee info",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: idParamsSchema },
  responses: {
    200: z.object({ timesheet: z.any() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      await connectDB()

      const timesheet = await Timesheet.findById(params!.id)
        .populate("employeeId", "name pin email")
        .populate("submittedBy", "email")
        .populate("approvedBy", "email")
        .populate("rejectedBy", "email")
        .populate("lockedBy", "email")
        .lean()

      if (!timesheet) {
        return { status: 404, data: { error: "Timesheet not found" } }
      }

      const shifts = await DailyShift.find({
        _id: { $in: timesheet.shiftIds },
      })
        .sort({ date: 1 })
        .lean()

      return {
        status: 200,
        data: { timesheet: { ...timesheet, shifts } },
      }
    } catch (err) {
      console.error("[api/timesheets/[id] GET]", err)
      return { status: 500, data: { error: "Failed to fetch timesheet" } }
    }
  },
})

const updateTimesheetSchema = z.object({
  notes: z.string().optional(),
  submissionNotes: z.string().optional(),
})

export const PUT = createApiRoute({
  method: "PUT",
  path: "/api/timesheets/[id]",
  summary: "Update timesheet notes",
  description: "Update notes on a draft timesheet. Only allowed when status is draft.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: idParamsSchema, body: updateTimesheetSchema },
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
            error: `Cannot update timesheet in '${timesheet.status}' status. Only draft timesheets can be edited.`,
          },
        }
      }

      if (body?.notes !== undefined) timesheet.notes = body.notes
      if (body?.submissionNotes !== undefined)
        timesheet.submissionNotes = body.submissionNotes

      await timesheet.save()

      return { status: 200, data: { success: true, timesheet } }
    } catch (err) {
      console.error("[api/timesheets/[id] PUT]", err)
      return { status: 500, data: { error: "Failed to update timesheet" } }
    }
  },
})
