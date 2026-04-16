import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { userSchedulingSettingsService } from "@/lib/services/user/user-scheduling-settings-service"

const dayHoursSchema = z
  .object({
    from: z.number(),
    to: z.number(),
  })
  .nullable()

const schedulingSettingsBodySchema = z.object({
  visibleFrom: z.number(),
  visibleTo: z.number(),
  workingHours: z.record(z.string(), dayHoursSchema).optional(),
})

const responseSchema = z.object({
  schedulingSettings: z.any().nullable(),
})

const errorResponseSchema = z.object({ error: z.string() })

export const GET = createApiRoute({
  method: "GET",
  path: "/api/users/me/scheduling-settings",
  summary: "Get scheduling UI settings",
  tags: ["users"],
  security: "adminAuth",
  responses: {
    200: responseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    try {
      const result = await userSchedulingSettingsService.get()
      return { status: 200, data: result }
    } catch (e) {
      console.error("[scheduling-settings GET]", e)
      return { status: 500, data: { error: "Failed to load settings" } }
    }
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/users/me/scheduling-settings",
  summary: "Update scheduling UI settings",
  tags: ["users"],
  security: "adminAuth",
  request: { body: schedulingSettingsBodySchema },
  responses: {
    200: responseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const result = await userSchedulingSettingsService.update(body)
      return { status: 200, data: result }
    } catch (e) {
      console.error("[scheduling-settings PATCH]", e)
      return { status: 500, data: { error: "Failed to save settings" } }
    }
  },
})
