import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, User } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import type { IUserSchedulingSettings } from "@/lib/db/schemas/user"

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
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      await connectDB()
      const user = await User.findById(auth.sub).select("schedulingSettings").lean()
      return {
        status: 200,
        data: { schedulingSettings: user?.schedulingSettings ?? null },
      }
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
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    if (!body) {
      return { status: 400, data: { error: "Body required" } }
    }

    const workingHours: IUserSchedulingSettings["workingHours"] = {}
    if (body.workingHours) {
      for (const [k, v] of Object.entries(body.workingHours)) {
        const n = Number(k)
        if (Number.isInteger(n) && n >= 0 && n <= 6) {
          workingHours[n] = v
        }
      }
    }

    const next: IUserSchedulingSettings = {
      visibleFrom: body.visibleFrom,
      visibleTo: body.visibleTo,
      workingHours,
    }

    try {
      await connectDB()
      await User.updateOne({ _id: auth.sub }, { $set: { schedulingSettings: next } })
      return {
        status: 200,
        data: { schedulingSettings: next },
      }
    } catch (e) {
      console.error("[scheduling-settings PATCH]", e)
      return { status: 500, data: { error: "Failed to save settings" } }
    }
  },
})
