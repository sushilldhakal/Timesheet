import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { publicHolidayService } from "@/lib/services/public-holiday/public-holiday-service"

const paramsSchema = z.object({
  id: z.string(),
})

const updateBodySchema = z.object({
  date: z.string().transform((s) => new Date(s)).optional(),
  name: z.string().min(1).optional(),
  state: z.enum(['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']).optional(),
  isRecurring: z.boolean().optional(),
})

function normalizeDateToLocalStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/public-holidays/[id]',
  summary: 'Get public holiday',
  description: 'Get a single public holiday by id',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({
      publicHoliday: z.object({
        _id: z.string(),
        date: z.date(),
        name: z.string(),
        state: z.string(),
        isRecurring: z.boolean(),
        createdAt: z.date(),
      }),
    }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      return await publicHolidayService.get(params!.id)
    } catch (err) {
      console.error("[api/public-holidays/[id] GET]", err)
      return { status: 500, data: { error: "Failed to fetch public holiday" } }
    }
  },
})

export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/public-holidays/[id]',
  summary: 'Update public holiday',
  description: 'Update an existing public holiday by id',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    params: paramsSchema,
    body: updateBodySchema,
  },
  responses: {
    200: z.object({
      success: z.boolean(),
      publicHoliday: z.object({
        _id: z.string(),
        date: z.date(),
        name: z.string(),
        state: z.string(),
        isRecurring: z.boolean(),
        createdAt: z.date(),
      }),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      return await publicHolidayService.update(params!.id, body)
    } catch (err: any) {
      console.error("[api/public-holidays/[id] PUT]", err)
      return publicHolidayService.mapDup(err, "Failed to update public holiday")
    }
  },
})

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/public-holidays/[id]',
  summary: 'Delete public holiday',
  description: 'Delete a public holiday by id',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ success: z.boolean() }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      return await publicHolidayService.remove(params!.id)
    } catch (err) {
      console.error("[api/public-holidays/[id] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete public holiday" } }
    }
  },
})
