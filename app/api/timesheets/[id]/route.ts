import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { apiErrors } from "@/lib/api/api-error"
import { timesheetService } from "@/lib/services/timesheet/timesheet-service"

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
    if (!ctx) throw apiErrors.unauthorized()
    const data = await timesheetService.getTimesheetById(params!.id)
    return { status: 200, data }
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
    if (!ctx) throw apiErrors.unauthorized()
    const data = await timesheetService.updateTimesheetNotes(params!.id, body ?? {})
    return { status: 200, data }
  },
})
