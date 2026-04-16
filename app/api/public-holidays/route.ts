import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { publicHolidayService } from "@/lib/services/public-holiday/public-holiday-service"

const listQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  state: z.enum(['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']).optional(),
})

const createBodySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  name: z.string().min(1),
  state: z.enum(['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
  isRecurring: z.boolean(),
})

function normalizeDateToLocalStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/public-holidays',
  summary: 'List public holidays',
  description: 'List public holidays with optional year and state filters',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    query: listQuerySchema,
  },
  responses: {
    200: z.object({
      publicHolidays: z.array(z.object({
        _id: z.string(),
        date: z.date(),
        name: z.string(),
        state: z.string(),
        isRecurring: z.boolean(),
        createdAt: z.date(),
      })),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      return {
        status: 200,
        data: await publicHolidayService.list(query),
      }
    } catch (err) {
      console.error("[api/public-holidays GET]", err)
      return { status: 500, data: { error: "Failed to fetch public holidays" } }
    }
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/public-holidays',
  summary: 'Create a public holiday',
  description: 'Create a single public holiday entry',
  tags: ['PublicHolidays'],
  security: 'adminAuth',
  request: {
    body: createBodySchema,
  },
  responses: {
    201: z.object({
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
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    try {
      return await publicHolidayService.create(body)
    } catch (err: any) {
      console.error("[api/public-holidays POST]", err)
      return publicHolidayService.mapDup(err, typeof err?.message === "string" ? err.message : "Failed to create public holiday")
    }
  },
})
